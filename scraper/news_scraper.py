#!/usr/bin/env python3
"""
Central Norway News Scraper
Scrapes newspapers from Trøndelag and Møre og Romsdal for articles
about inefficient workflows and digitalization opportunities.
Runs daily via cron at 10 AM.
"""

import asyncio
import aiohttp
import json
import re
import os
from datetime import datetime, timedelta
from urllib.parse import urljoin, quote
from bs4 import BeautifulSoup
import feedparser

# Slack notification via OpenClaw message tool
# Findings are saved to JSON for manual review and sending

# Keywords to search for (Norwegian)
KEYWORDS = [
    "ineffektiv", "ineffektive", "tungvint", "tungvinte",
    "manuell", "manuelt", "papirbasert", "papir",
    "rapporteringskrav", "rapportering", "byråkrati",
    "tidskrevende", "tungrodd", "gammeldags",
    "digitalisering", "digital", "automasjon", "effektivisering",
    "flaskehals", "prosess", "arbeidsflyt"
]

# Sources - newspapers in Trøndelag and Møre og Romsdal
SOURCES = {
    "adresseavisen": {
        "name": "Adresseavisen",
        "region": "Trøndelag",
        "rss": "https://www.adresseavisen.no/rss",
        "base_url": "https://www.adresseavisen.no",
        "paywall": True
    },
    "tronderavisa": {
        "name": "Trønder-Avisa",
        "region": "Trøndelag", 
        "rss": "https://www.tronderavisa.no/rss",
        "base_url": "https://www.tronderavisa.no",
        "paywall": True
    },
    "sunnmorsposten": {
        "name": "Sunnmørsposten",
        "region": "Møre og Romsdal",
        "rss": "https://www.smp.no/rss",
        "base_url": "https://www.smp.no",
        "paywall": True
    },
    "tidenskrav": {
        "name": "Tidens Krav",
        "region": "Møre og Romsdal",
        "rss": "https://www.tk.no/rss",
        "base_url": "https://www.tk.no",
        "paywall": True
    },
    "rbnett": {
        "name": "Romsdals Budstikke",
        "region": "Møre og Romsdal", 
        "rss": "https://www.rbnett.no/rss",
        "base_url": "https://www.rbnett.no",
        "paywall": True
    },
    "fosnafolket": {
        "name": "Fosna-Folket",
        "region": "Trøndelag",
        "rss": "https://www.fosna-folket.no/rss",
        "base_url": "https://www.fosna-folket.no",
        "paywall": True
    }
}

class NewsScraper:
    def __init__(self):
        self.findings = []
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers={'User-Agent': 'Herold-NewsBot/1.0'}
        )
        return self
        
    async def __aexit__(self, *args):
        await self.session.close()
    
    def is_recent(self, published_date, hours=24):
        """Check if article is from last N hours"""
        if not published_date:
            return True  # Include if unknown
        
        now = datetime.now()
        
        # Try various date formats
        for fmt in ['%a, %d %b %Y %H:%M:%S %z', '%Y-%m-%dT%H:%M:%S', '%d.%m.%Y']:
            try:
                article_date = datetime.strptime(published_date[:25], fmt)
                return (now - article_date) < timedelta(hours=hours)
            except:
                continue
        
        return True  # Default to including if parse fails
    
    def extract_names(self, text):
        """Extract Norwegian names from text (Firstname Lastname pattern)"""
        # Common Norwegian first names pattern
        name_pattern = r'\b([A-ZÆØÅ][a-zæøå]+\s+[A-ZÆØÅ][a-zæøå]+)\b'
        matches = re.findall(name_pattern, text)
        
        # Filter out common false positives
        exclude_words = ['Adresseavisen', 'Sunnmørsposten', 'Tidens', 'Krav', 
                        'Trønder-Avisa', 'Romsdals', 'Budstikke', 'Fosna-Folket']
        
        names = [m for m in matches if not any(ex in m for ex in exclude_words)]
        return list(set(names))[:3]  # Max 3 names
    
    def extract_contact_info(self, text):
        """Extract email and phone numbers"""
        emails = re.findall(r'[\w.-]+@[\w.-]+\.\w+', text)
        phones = re.findall(r'\+?\d[\d\s-]{7,}\d', text)
        return emails, phones
    
    def score_article(self, title, summary):
        """Score article relevance based on keywords"""
        text = (title + " " + summary).lower()
        score = 0
        matched_keywords = []
        
        for keyword in KEYWORDS:
            if keyword.lower() in text:
                score += 1
                matched_keywords.append(keyword)
        
        # Bonus for management-related terms
        management_terms = ['daglig leder', 'administrerende direktør', 'ceo', 
                          'sjef', 'leder', 'direktør', 'styrer']
        if any(term in text for term in management_terms):
            score += 2
        
        return score, matched_keywords
    
    async def fetch_article(self, url, paywall=False):
        """Fetch and parse article content"""
        if paywall:
            return None, True  # Skip paywalled content for now
        
        try:
            async with self.session.get(url, timeout=10) as resp:
                if resp.status == 200:
                    html = await resp.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Extract article text (common selectors)
                    article = soup.find('article') or soup.find(class_=re.compile('article|content'))
                    if article:
                        return article.get_text(separator=' ', strip=True), False
                    
                    # Fallback to all paragraphs
                    paragraphs = soup.find_all('p')
                    text = ' '.join(p.get_text() for p in paragraphs)
                    return text, False
                    
        except Exception as e:
            print(f"Error fetching {url}: {e}")
        
        return None, paywall
    
    async def scrape_source(self, source_id, source_config):
        """Scrape a single news source"""
        print(f"Scraping {source_config['name']}...")
        
        try:
            # Parse RSS feed
            feed = feedparser.parse(source_config['rss'])
            
            for entry in feed.entries[:20]:  # Check last 20 entries
                # Check if recent
                published = entry.get('published', entry.get('updated', ''))
                if not self.is_recent(published):
                    continue
                
                title = entry.get('title', '')
                summary = entry.get('summary', entry.get('description', ''))
                link = entry.get('link', '')
                
                # Score article
                score, keywords = self.score_article(title, summary)
                
                if score >= 2:  # Threshold for relevance
                    # Try to fetch full article
                    article_text, is_paywalled = await self.fetch_article(
                        link, 
                        source_config.get('paywall', False)
                    )
                    
                    if is_paywalled:
                        content = summary
                        paywall_note = "🔒 Paywall - limited access"
                    else:
                        content = article_text or summary
                        paywall_note = None
                    
                    # Extract contact info
                    names = self.extract_names(content)
                    emails, phones = self.extract_contact_info(content)
                    
                    finding = {
                        'source': source_config['name'],
                        'region': source_config['region'],
                        'title': title,
                        'url': link,
                        'published': published,
                        'summary': summary[:300] + '...' if len(summary) > 300 else summary,
                        'score': score,
                        'keywords': keywords,
                        'names': names,
                        'emails': emails,
                        'phones': phones,
                        'paywall': is_paywalled,
                        'paywall_note': paywall_note
                    }
                    
                    self.findings.append(finding)
                    print(f"  Found: {title[:60]}...")
                    
        except Exception as e:
            print(f"Error scraping {source_config['name']}: {e}")
    
    async def scrape_all(self):
        """Scrape all configured sources"""
        tasks = []
        for source_id, config in SOURCES.items():
            tasks.append(self.scrape_source(source_id, config))
        
        await asyncio.gather(*tasks)
    
    def format_slack_message(self):
        """Format findings for Slack"""
        if not self.findings:
            return None
        
        # Sort by score
        sorted_findings = sorted(self.findings, key=lambda x: x['score'], reverse=True)
        
        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"📰 Daily News Scan - {datetime.now().strftime('%d.%m.%Y')}",
                    "emoji": True
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"Found *{len(sorted_findings)}* potential leads from Central Norway newspapers"
                }
            },
            {"type": "divider"}
        ]
        
        for finding in sorted_findings[:5]:  # Top 5 findings
            contact_info = []
            if finding['names']:
                contact_info.append(f"👤 {', '.join(finding['names'])}")
            if finding['emails']:
                contact_info.append(f"📧 {', '.join(finding['emails'][:2])}")
            if finding['phones']:
                contact_info.append(f"📞 {', '.join(finding['phones'][:1])}")
            
            paywall_icon = "🔒 " if finding['paywall'] else ""
            
            text = f"*{paywall_icon}{finding['source']}* ({finding['region']})\n"
            text += f"•<{finding['url']}|{finding['title']}>*\n"
            text += f"Keywords: {', '.join(finding['keywords'][:3])}\n"
            
            if contact_info:
                text += f"\n_Contact:_ {' | '.join(contact_info)}"
            
            if finding['paywall_note']:
                text += f"\n_{finding['paywall_note']}_"
            
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": text
                }
            })
            blocks.append({"type": "divider"})
        
        return {"blocks": blocks}
    
    def format_text_report(self):
        """Format findings as text for Slack"""
        if not self.findings:
            return None
        
        sorted_findings = sorted(self.findings, key=lambda x: x['score'], reverse=True)
        
        lines = [
            f"📰 Daily News Scan - {datetime.now().strftime('%d.%m.%Y')}",
            f"Found {len(sorted_findings)} potential leads from Central Norway newspapers",
            ""
        ]
        
        for i, finding in enumerate(sorted_findings[:5], 1):
            paywall_icon = "🔒 " if finding['paywall'] else ""
            lines.append(f"{i}. {paywall_icon}*{finding['source']}* ({finding['region']})")
            lines.append(f"   <{finding['url']}|{finding['title']}>")
            lines.append(f"   Keywords: {', '.join(finding['keywords'][:3])}")
            
            if finding['names']:
                lines.append(f"   👤 {', '.join(finding['names'])}")
            if finding['emails']:
                lines.append(f"   📧 {', '.join(finding['emails'][:2])}")
            if finding['phones']:
                lines.append(f"   📞 {', '.join(finding['phones'][:1])}")
            
            lines.append("")
        
        return "\n".join(lines)
    
    async def save_findings(self):
        """Save findings to JSON and text report"""
        date_str = datetime.now().strftime('%Y%m%d')
        
        # Save JSON
        json_file = f"/data/.openclaw/workspace/herold_workbench/scraper/findings_{date_str}.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump({
                'date': datetime.now().isoformat(),
                'findings': self.findings
            }, f, ensure_ascii=False, indent=2)
        print(f"💾 Saved findings to {json_file}")
        
        # Save text report for Slack
        report = self.format_text_report()
        if report:
            report_file = f"/data/.openclaw/workspace/herold_workbench/scraper/report_{date_str}.txt"
            with open(report_file, 'w', encoding='utf-8') as f:
                f.write(report)
            print(f"💾 Saved report to {report_file}")
            return report_file
        return None


async def main():
    print(f"🔍 Starting news scan at {datetime.now()}")
    
    async with NewsScraper() as scraper:
        await scraper.scrape_all()
        report_file = await scraper.save_findings()
        
        if report_file:
            print(f"\n📋 Report ready at: {report_file}")
            print("   Herold will read and send this via Slack")
    
    print(f"✅ Completed at {datetime.now()}")


if __name__ == '__main__':
    asyncio.run(main())
