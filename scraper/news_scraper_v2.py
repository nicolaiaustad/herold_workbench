#!/usr/bin/env python3
"""
Central Norway News Scraper - Extended timeout version
Monitors NRK + regional newspapers for digitalization leads
"""

import json
import re
import socket
import ssl
import urllib.request
from datetime import datetime

# Extend socket timeout for slow feeds
socket.setdefaulttimeout(60)

KEYWORDS = [
    "ineffektiv", "ineffektive", "tungvint", "tungvinte",
    "manuell", "manuelt", "papirbasert", "papir",
    "rapporteringskrav", "rapportering", "byråkrati",
    "tidskrevende", "tungrodd", "gammeldags",
    "digitalisering", "digital", "automasjon", "effektivisering",
    "flaskehals", "prosess", "arbeidsflyt", "system", "it"
]

SOURCES = {
    "nrk_trondelag": {
        "name": "NRK Trøndelag",
        "region": "Trøndelag",
        "rss": "https://www.nrk.no/trondelag/toppsaker.rss",
        "paywall": False
    },
    "nrk_more_og_romsdal": {
        "name": "NRK Møre og Romsdal",
        "region": "Møre og Romsdal",
        "rss": "https://www.nrk.no/mr/toppsaker.rss",
        "paywall": False
    },
    "nrk_nyheter": {
        "name": "NRK Nyheter",
        "region": "Nasjonal",
        "rss": "https://www.nrk.no/norge/toppsaker.rss",
        "paywall": False
    },
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
        "paywall": True,
        "geo_blocked": True,
        "note": "Requires Norwegian IP - blocked from this VPS"
    },
    "sunnmorsposten": {
        "name": "Sunnmørsposten",
        "region": "Møre og Romsdal",
        "rss": "https://www.smp.no/rss",
        "paywall": True
    },
    "tidenskrav": {
        "name": "Tidens Krav",
        "region": "Møre og Romsdal",
        "rss": "https://www.tk.no/rss",
        "paywall": True,
        "geo_blocked": True
    },
    "dn_nordic": {
        "name": "Dagens Næringsliv - Digital",
        "region": "Nasjonal",
        "rss": "https://www.dn.no/rss",
        "paywall": True
    },
    "rbnett": {
        "name": "Romsdals Budstikke",
        "region": "Møre og Romsdal", 
        "rss": "https://www.rbnett.no/rss",
        "paywall": True
    }
}

import socks  # PySocks for SOCKS5 proxy support
import socket as socket_module

def fetch_feed(url, timeout=45, use_proxy=False):
    """Fetch RSS feed with extended timeout, optionally via SOCKS5 proxy"""
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'},
            method='GET'
        )
        
        # Use SOCKS5 proxy for geo-blocked sites
        if use_proxy:
            # Save original socket
            original_socket = socket_module.socket
            # Set up SOCKS5 proxy
            socks.set_default_proxy(socks.SOCKS5, "localhost", 1055)
            socket_module.socket = socks.socksocket
        
        try:
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as response:
                return response.read().decode('utf-8')
        finally:
            if use_proxy:
                # Restore original socket
                socket_module.socket = original_socket
                
    except Exception as e:
        return None

def parse_rss(xml_content):
    """Simple RSS parser"""
    if not xml_content:
        return []
    
    items = []
    import xml.etree.ElementTree as ET
    
    try:
        root = ET.fromstring(xml_content)
        # Find channel
        channel = root.find('.//channel')
        if channel is None:
            return items
        
        for item in channel.findall('item'):
            title = item.find('title')
            link = item.find('link')
            desc = item.find('description')
            
            items.append({
                'title': title.text if title is not None else '',
                'link': link.text if link is not None else '',
                'description': desc.text if desc is not None else ''
            })
    except:
        pass
    
    return items

def score_article(title, summary):
    text = (title + " " + summary).lower()
    score = 0
    matched = []
    for kw in KEYWORDS:
        if kw in text:
            score += 1
            matched.append(kw)
    
    # Bonus for business/management context
    business_terms = ['bedrift', 'næringsliv', 'kommune', 'offentlig', 'virksomhet']
    if any(term in text for term in business_terms):
        score += 1
    
    return score, matched

def extract_names(text):
    pattern = r'\b([A-ZÆØÅ][a-zæøå]+\s+[A-ZÆØÅ][a-zæøå]+)\b'
    matches = re.findall(pattern, text)
    exclude = ['Adresseavisen', 'Trønder-Avisa', 'Sunnmørsposten', 'Tidens', 'Krav', 
               'Romsdals', 'Budstikke', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 
               'Fredag', 'Lørdag', 'Søndag', 'Januar', 'Februar', 'Mars', 'April']
    return list(set([m for m in matches if not any(ex in m for ex in exclude)]))[:3]

def main():
    print(f"🔍 Starting news scan at {datetime.now()}")
    print(f"   Timeout: 45s per source")
    findings = []
    
    for source_id, config in SOURCES.items():
        # Use proxy for geo-blocked sources
        use_proxy = config.get('geo_blocked', False)
        if use_proxy:
            print(f"\n  Checking {config['name']} (via Norway proxy)...")
        else:
            print(f"\n  Checking {config['name']}...")
        
        try:
            xml = fetch_feed(config['rss'], use_proxy=use_proxy)
            if xml is None:
                print(f"    ✗ Timeout or error")
                continue
            
            items = parse_rss(xml)
            found_count = 0
            
            for item in items[:15]:  # Check first 15 items
                title = item.get('title', '')
                summary = item.get('description', '')
                link = item.get('link', '')
                
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
                    found_count += 1
                    print(f"    ✓ {title[:55]}...")
            
            if found_count == 0:
                print(f"    ℹ️ No relevant articles (checked {len(items)})")
                
        except Exception as e:
            print(f"    ✗ Error: {type(e).__name__}")
    
    # Save results
    date_str = datetime.now().strftime('%Y%m%d')
    json_file = f"/data/.openclaw/workspace/herold_workbench/scraper/findings_{date_str}.json"
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump({'date': datetime.now().isoformat(), 'findings': findings}, f, indent=2, ensure_ascii=False)
    
    # Generate report
    if findings:
        findings.sort(key=lambda x: x['score'], reverse=True)
        lines = [
            f"📰 Daily News Scan - {datetime.now().strftime('%d.%m.%Y')}",
            f"Found {len(findings)} potential leads from Central Norway",
            ""
        ]
        
        for i, f in enumerate(findings[:5], 1):
            icon = "🔒 " if f['paywall'] else ""
            lines.append(f"{i}. {icon}*{f['source']}* ({f['region']})")
            lines.append(f"   {f['title']}")
            lines.append(f"   {f['url']}")
            lines.append(f"   Keywords: {', '.join(f['keywords'])}")
            if f['names']:
                lines.append(f"   👤 {', '.join(f['names'])}")
            lines.append("")
        
        paywalled = sum(1 for f in findings if f['paywall'])
        if paywalled > 0:
            lines.append(f"---")
            lines.append(f"⚠️ {paywalled} article(s) behind paywall")
        
        report_file = f"/data/.openclaw/workspace/herold_workbench/scraper/report_{date_str}.txt"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        
        print(f"\n✅ Report saved: {report_file}")
        print(f"   Found: {len(findings)} leads")
    else:
        report_file = f"/data/.openclaw/workspace/herold_workbench/scraper/report_{date_str}.txt"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(f"📰 Daily News Scan - {datetime.now().strftime('%d.%m.%Y')}\n")
            f.write(f"ℹ️ No relevant leads found today.\n")
        print(f"\nℹ️ No findings today")
    
    print(f"✅ Done at {datetime.now()}")

if __name__ == '__main__':
    main()
