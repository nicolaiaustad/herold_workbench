# Central Norway News Scraper

Daily automated scraper that monitors newspapers from Trøndelag and Møre og Romsdal for articles about inefficient workflows and digitalization opportunities.

## Setup

```bash
cd /data/.openclaw/workspace/herold_workbench/scraper
chmod +x setup-cron.sh
./setup-cron.sh
```

## How It Works

1. **Daily at 10 AM**: Scraper runs and checks newspapers
2. **Findings saved**: Results stored in `findings_YYYYMMDD.json` and `report_YYYYMMDD.txt`
3. **Herold sends report**: I read the report and send it directly to you on Slack

## Manual Run

```bash
cd /data/.openclaw/workspace/herold_workbench/scraper
./venv/bin/python3 news_scraper.py
```

After running, I'll see the report and can send it to you immediately.

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
