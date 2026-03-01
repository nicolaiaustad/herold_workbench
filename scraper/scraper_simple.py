#!/usr/bin/env python3
"""
Simple synchronous version of Central Norway News Scraper
"""

import json
import re
import requests
import feedparser
from datetime import datetime, timedelta
from bs4 import BeautifulSoup

KEYWORDS = [
    "ineffektiv", "ineffektive", "tungvint", "tungvinte",
    "manuell", "manuelt", "papirbasert", "papir",
    "rapporteringskrav", "rapportering", "byråkrati",
    "tidskrevende", "tungrodd", "gammeldags",
    "digitalisering", "digital", "automasjon", "effektivisering",
    "flaskehals", "prosess", "arbeidsflyt"
]

SOURCES = {
    "adresseavisen": {
        "name": "Adresseavisen",
        "region": "Trøndelag",
        "rss": "https://www.adresseavisen.no/rss",
        "paywall": True
    },
    "tronderavisa": {
        "name": "Trønder-Avisa",
        "region": "Trøndelag", 
        "rss": "https://www.tronderavisa.no/rss",
        "paywall": True
    },
    "sunnmorsposten": {
        "name": "Sunnmørsposten",
        "region": "Møre og Romsdal",
        "rss": "https://www.smp.no/rss",
        "paywall": True
    }
}

def score_article(title, summary):
    text = (title + " " + summary).lower()
    score = 0
    matched = []
    for kw in KEYWORDS:
        if kw in text:
            score += 1
            matched.append(kw)
    return score, matched

def extract_names(text):
    pattern = r'\b([A-ZÆØÅ][a-zæøå]+\s+[A-ZÆØÅ][a-zæøå]+)\b'
    matches = re.findall(pattern, text)
    exclude = ['Adresseavisen', 'Trønder-Avisa', 'Sunnmørsposten']
    return list(set([m for m in matches if not any(ex in m for ex in exclude)]))[:3]

def main():
    print(f"🔍 Starting scan at {datetime.now()}")
    findings = []
    
    for source_id, config in SOURCES.items():
        print(f"  Checking {config['name']}...")
        try:
            feed = feedparser.parse(config['rss'])
            for entry in feed.entries[:10]:
                title = entry.get('title', '')
                summary = entry.get('summary', '')
                link = entry.get('link', '')
                
                score, keywords = score_article(title, summary)
                if score >= 2:
                    finding = {
                        'source': config['name'],
                        'region': config['region'],
                        'title': title,
                        'url': link,
                        'score': score,
                        'keywords': keywords,
                        'names': extract_names(summary),
                        'paywall': config.get('paywall', False)
                    }
                    findings.append(finding)
                    print(f"    ✓ {title[:50]}...")
        except Exception as e:
            print(f"    ✗ Error: {e}")
    
    # Save results
    date_str = datetime.now().strftime('%Y%m%d')
    json_file = f"/data/.openclaw/workspace/herold_workbench/scraper/findings_{date_str}.json"
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump({'date': datetime.now().isoformat(), 'findings': findings}, f, indent=2)
    
    # Generate report
    if findings:
        findings.sort(key=lambda x: x['score'], reverse=True)
        lines = [f"📰 News Scan - {datetime.now().strftime('%d.%m.%Y')}", f"Found {len(findings)} leads:", ""]
        for i, f in enumerate(findings[:5], 1):
            icon = "🔒 " if f['paywall'] else ""
            lines.append(f"{i}. {icon}*{f['source']}* ({f['region']})")
            lines.append(f"   {f['title']}")
            lines.append(f"   {f['url']}")
            lines.append(f"   Keywords: {', '.join(f['keywords'])}")
            if f['names']:
                lines.append(f"   👤 {', '.join(f['names'])}")
            lines.append("")
        
        report_file = f"/data/.openclaw/workspace/herold_workbench/scraper/report_{date_str}.txt"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        print(f"\n✅ Report saved: {report_file}")
    else:
        print("\nℹ️ No findings today")
    
    print(f"✅ Done at {datetime.now()}")

if __name__ == '__main__':
    main()
