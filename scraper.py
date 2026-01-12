import requests
from bs4 import BeatufiulSoup
import pandas as pd
from datetime import datetime

# URL to scrape
url = "https://stats.mnbasketballhub.com/stats/team_instance/10359937?subseason=955354&tab=team_instance_player_stats&tool=5783733"

# Headers to mimic a browser request
headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)AppleWebKit/537.36'
}

try: 
  # Fetch the page
  response = requests.get(url, headers=headers, timeout=10)
  response.raise_for_status()

  # Parse HTML
  soup = BeautifulSoup(response.content, 'html.parser')

  #Define selectors for each table
  table_selectors = [
    {'id': 'player-sm-basketball_scoring-table', 'name': 'Scoring'},
    {'id': 'player-sm-basketball_rebounds-table', 'name': 'Rebounds'},
    {'id': 'player-sm-basketball_misc-table', 'name': 'Misc'}
  ]

  # Create Excel writer
  output_path = 'stats.xlsx'

  with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
    for selector in table_selectors:
      # Find the table using the selector
      table = soup.find('table', id=selector['id'])

      if table:
        # Convert table to DataFrame
        df = pd.read_html(str(table))

        # Save to Excel with sheet name
        df.to_excel(writer, sheet_name=selector['name'], index=False)
        print(f"Saved {selector['name']} to Excel")
      else:
        print(f"Table {selector['name']} not found")

  print(f" All tables saved to {output_path}")

except Exception as e:
  print(f"Error: {e}")

        
  

 
