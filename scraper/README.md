# Central Norway News Scraper

Daily automated scraper that monitors newspapers from Trøndelag and Møre og Romsdal for articles about inefficient workflows and digitalization opportunities.

## Setup

```bash
cd /data/.openclaw/workspace/herold_workbench/scraper
chmod +x setup-cron.sh
./setup-cron.sh
```

## Environment Variables

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

Add to `~/.bashrc` or `~/.profile` to persist.

## Manual Run

```bash
cd /data/.openclaw/workspace/herold_workbench/scraper
python3 news_scraper.py
```

## Sources Monitored

### Trøndelag
- Adresseavisen
- Trønder-Avisa
- Fosna-Folket

### Møre og Romsdal
- Sunnmørsposten
- Tidens Krav
- Romsdals Budstikke

## Keywords (Norwegian)

- ineffektiv/ineffektive
- tungvint/tungvinte
- manuell/manuelt
- papirbasert/papir
- rapporteringskrav/rapportering
- byråkrati
- tidskrevende
- tungrodd
- flaskehals
- prosess
- arbeidsflyt
- digitalisering

## Output

- Findings saved to `findings_YYYYMMDD.json`
- Logs to `logs/scraper.log`
- Slack notification with top 5 leads

## Cron Schedule

Runs daily at 10:00 AM (system time)

```
0 10 * * * cd ... && python3 news_scraper.py >> logs/scraper.log 2>&1
```
