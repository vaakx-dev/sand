Scripts let the agent write one short JavaScript program that calls its other tools, instead of calling them one at a time. The tool results stay inside the script and only what it prints comes back, so a task that reads twenty files uses a fraction of the tokens and finishes sooner.

## Good for

- Searching a whole project and keeping only the lines that matter
- Reading every CSV from a week of lab runs and printing one summary table
- Renaming or checking many files in one step instead of dozens

## Try it

Ask a thread: "Read every .csv in data/ and tell me which run had the highest peak temperature."
