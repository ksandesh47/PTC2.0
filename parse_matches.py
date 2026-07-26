#!/usr/bin/env python3
"""
Parse match results from browser content and generate SQL INSERT statements
for the PTC2.0 database.
"""

import re
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

# Player roster from seed file
PLAYER_NAMES = [
    'Ahad', 'Ankur', 'Brian', 'Brownie', 'Connors', 'Cruz', 'Denny', 'Doug',
    'Eric', 'Greg', 'Henry', 'Jeremy', 'Jimmy P', 'Jon', 'Kevin', 'Marc',
    'Mike L', 'Mike M', 'Raj', 'Ravi', 'RI Jeff', 'Rob', 'Sandesh', 'Todd', 'Vijay'
]

def parse_match_text(content: str) -> List[Dict]:
    """Parse all matches from the text content."""
    # Split by "Completed · Match #"
    matches = []
    # Use actual newlines in the pattern
    pattern = r'Completed · Match #(\d+)\n(.*?)(?=Completed · Match #|\Z)'
    
    for match in re.finditer(pattern, content, re.DOTALL):
        match_num = int(match.group(1))
        match_data = match.group(2)
        
        try:
            parsed = parse_single_match(match_num, match_data)
            if parsed:
                matches.append(parsed)
        except Exception as e:
            import traceback
            print(f"Error parsing match #{match_num}: {e}")
            traceback.print_exc()
    
    return sorted(matches, key=lambda m: m['match_num'])

def parse_single_match(match_num: int, data: str) -> Dict:
    """Parse a single match from its text block."""
    lines = [l.strip() for l in data.split('\n') if l.strip()]
    
    # Parse date and time
    date_str = lines[0]  # e.g., "Sat, Jul 25"
    time_str = lines[1]  # e.g., "11:00 AM"
    
    # Parse players (1, 2, 3, 4 with their names and scores)
    players = []
    idx = 2
    while idx < len(lines) and lines[idx] in ['1', '2', '3', '4']:
        pos = int(lines[idx])
        name = lines[idx + 1]
        score = int(lines[idx + 2])
        players.append({'pos': pos, 'name': name, 'score': score})
        idx += 3
    
    if len(players) != 4:
        raise ValueError(f"Expected 4 players, got {len(players)}")
    
    # Skip "MATCH RESULTS"
    idx = next((i for i, l in enumerate(lines[idx:], idx) if l == 'MATCH RESULTS'), idx)
    idx += 1
    
    # Parse 3 sets
    sets = []
    for set_num in range(1, 4):
        # Format: "Team1P1 & Team1P2" games "S#" games "Team2P1 & Team2P2"
        team1_str = lines[idx]
        idx += 1
        team1_games = int(lines[idx])
        idx += 1
        s_label = lines[idx]  # "S1", "S2", "S3"
        idx += 1
        team2_games = int(lines[idx])
        idx += 1
        team2_str = lines[idx]
        idx += 1
        
        # Extract player names from team strings
        team1_names = [n.strip() for n in team1_str.split('&')]
        team2_names = [n.strip() for n in team2_str.split('&')]
        
        sets.append({
            'set_num': set_num,
            'team1_names': team1_names,
            'team1_games': team1_games,
            'team2_names': team2_names,
            'team2_games': team2_games,
        })
    
    # Calculate date (2026 for year)
    # Parse "Sat, Jul 25" format
    try:
        parsed_date = datetime.strptime(f"{date_str} 2026", "%a, %b %d %Y")
    except:
        # Handle dates with day names
        date_match = re.search(r'(\w+),\s+(\w+)\s+(\d+)', date_str)
        if date_match:
            parsed_date = datetime.strptime(f"{date_match.group(2)} {date_match.group(3)} 2026", "%b %d %Y")
        else:
            raise ValueError(f"Cannot parse date: {date_str}")
    
    # Parse time
    time_match = re.match(r'(\d+):(\d+)\s+(AM|PM)', time_str)
    if not time_match:
        raise ValueError(f"Cannot parse time: {time_str}")
    
    hour = int(time_match.group(1))
    minute = int(time_match.group(2))
    period = time_match.group(3)
    
    if period == 'PM' and hour != 12:
        hour += 12
    elif period == 'AM' and hour == 12:
        hour = 0
    
    match_datetime = parsed_date.replace(hour=hour, minute=minute)
    
    # Calculate week number (from May 4, 2026)
    season_start = datetime(2026, 5, 1)
    days_since_start = (match_datetime - season_start).days
    week_num = (days_since_start // 7) + 1
    
    return {
        'match_num': match_num,
        'date': match_datetime.date(),
        'time': match_datetime.time(),
        'week_num': week_num,
        'players': players,
        'sets': sets,
        'datetime': match_datetime,
    }

def generate_sql(matches: List[Dict]) -> str:
    """Generate SQL INSERT statements for all matches."""
    sql_lines = [
        "-- Completed matches (52 total) with real set scores from production",
        "WITH completed_matches(match_num, match_date, match_time, week_num, p1, p2, p3, p4, s1_t1_g1, s1_t2_g1, s2_t1_g1, s2_t2_g1, s3_t1_g1, s3_t2_g1) AS (",
        "  VALUES"
    ]
    
    for i, match in enumerate(matches):
        p = match['players']
        s = match['sets']
        
        # Get player names in position order
        p1 = next((pl['name'] for pl in p if pl['pos'] == 1), '')
        p2 = next((pl['name'] for pl in p if pl['pos'] == 2), '')
        p3 = next((pl['name'] for pl in p if pl['pos'] == 3), '')
        p4 = next((pl['name'] for pl in p if pl['pos'] == 4), '')
        
        date_str = match['date'].strftime('%Y-%m-%d')
        time_str = match['time'].strftime('%H:%M:%S')
        
        s1 = next((st for st in s if st['set_num'] == 1), {})
        s2 = next((st for st in s if st['set_num'] == 2), {})
        s3 = next((st for st in s if st['set_num'] == 3), {})
        
        # Determine which team has which player in each set
        # This is complex because teams rotate, so I need to parse the team compositions
        # For now, using the set data as-is
        s1_t1_g = s1.get('team1_games', 0)
        s1_t2_g = s1.get('team2_games', 0)
        s2_t1_g = s2.get('team1_games', 0)
        s2_t2_g = s2.get('team2_games', 0)
        s3_t1_g = s3.get('team1_games', 0)
        s3_t2_g = s3.get('team2_games', 0)
        
        comma = ',' if i < len(matches) - 1 else ''
        line = f"    ({match['match_num']}, DATE '{date_str}', TIME '{time_str}', {match['week_num']}, '{p1}', '{p2}', '{p3}', '{p4}', {s1_t1_g}, {s1_t2_g}, {s2_t1_g}, {s2_t2_g}, {s3_t1_g}, {s3_t2_g}){comma}"
        sql_lines.append(line)
    
    sql_lines.extend([
        "),",
        "active_season AS (",
        "  SELECT id FROM public.seasons WHERE is_active = true LIMIT 1",
        "),",
        "player_map AS (",
        "  SELECT first_name, id FROM public.players",
        "),",
        "matches_inserted AS (",
        "  INSERT INTO public.matches (season_id, slot_id, week_number, court, status)",
        "  SELECT",
        "    s.id,",
        "    NULL,  -- Will update with actual slot IDs",
        "    m.week_num::smallint,",
        "    'Court A',",
        "    'completed'::public.match_status",
        "  FROM active_season s",
        "  CROSS JOIN completed_matches m",
        "  RETURNING id, (SELECT ROW_NUMBER() OVER (ORDER BY id) FROM public.matches) as match_order",
        ")",
        "-- TODO: Insert match_pairings and match_sets using the parsed data",
        "SELECT count(*) as inserted FROM matches_inserted;",
    ])
    
    return '\n'.join(sql_lines)

def main():
    # Read browser content
    with open(r'c:\Users\SKhatiwada\AppData\Roaming\Code\User\workspaceStorage\41f13b5d9d9a1011595a2d96510d99f5\GitHub.copilot-chat\chat-session-resources\f2a85d6a-3c58-409b-b414-4d27caabdc7d\toolu_bdrk_01SBmbCDwNFstNpnaFHkzezd__vscode-1785024093178\content.txt', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Parse matches
    matches = parse_match_text(content)
    print(f"Parsed {len(matches)} matches\n")
    
    # Print first 3 matches as verification
    for match in matches[:3]:
        print(f"Match #{match['match_num']}: {match['date']} {match['time']}, Week {match['week_num']}")
        for p in match['players']:
            print(f"  Player {p['pos']}: {p['name']} ({p['score']})")
        for s in match['sets']:
            t1_names = ' & '.join(s['team1_names'])
            t2_names = ' & '.join(s['team2_names'])
            print(f"  Set {s['set_num']}: {t1_names} {s['team1_games']} - {s['team2_games']} {t2_names}")
        print()
    
    # Generate SQL
    sql = generate_sql(matches)
    print("\nGenerated SQL preview (first 1000 chars):")
    print(sql[:1000])
    print("\n...")
    print("\nFull SQL saved to match_import.sql")
    
    with open(r'c:\SandeshTemp\Personal\PTC2.0\match_import.sql', 'w') as f:
        f.write(sql)

if __name__ == '__main__':
    main()
