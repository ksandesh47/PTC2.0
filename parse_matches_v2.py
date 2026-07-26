#!/usr/bin/env python3
"""
Parse match results from browser content and generate SQL INSERT statements.
Simpler, more robust version.
"""

import re
from datetime import datetime

def parse_all_matches():
    """Parse all matches from the browser content file."""
    with open(r'c:\Users\SKhatiwada\AppData\Roaming\Code\User\workspaceStorage\41f13b5d9d9a1011595a2d96510d99f5\GitHub.copilot-chat\chat-session-resources\f2a85d6a-3c58-409b-b414-4d27caabdc7d\toolu_bdrk_01SBmbCDwNFstNpnaFHkzezd__vscode-1785024093178\content.txt', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split by match marker
    parts = content.split('Completed · Match #')
    print(f"Found {len(parts) - 1} match blocks")
    
    matches = []
    for i, part in enumerate(parts[1:], 1):  # Skip header
        lines = part.split('\n')
        
        if len(lines) < 20:
            continue
            
        try:
            match_data = parse_match_lines(i, lines)
            if match_data:
                matches.append(match_data)
                print(f"✓ Parsed Match #{i}: {match_data['date']} - {match_data['players']}")
        except Exception as e:
            print(f"✗ Error parsing Match #{i}: {e}")
    
    return matches

def parse_match_lines(match_num, lines):
    """Parse a single match from its line array."""
    data = {}
    data['match_num'] = match_num
    
    # Remove empty lines
    lines = [l.strip() for l in lines if l.strip()]
    
    # First line is match number (redundant), so skip
    # Next is date
    date_str = lines[0]
    time_str = lines[1]
    
    # Parse date (e.g., "Sat, Jul 25")
    match_date = re.search(r'(\w+),\s+(\w+)\s+(\d+)', date_str)
    if match_date:
        date_obj = datetime.strptime(f"{match_date.group(2)} {match_date.group(3)} 2026", "%b %d %Y")
        data['date'] = date_obj.strftime("%Y-%m-%d")
    
    # Parse time (e.g., "11:00 AM")
    match_time = re.search(r'(\d+):(\d+)\s+(AM|PM)', time_str)
    if match_time:
        hour = int(match_time.group(1))
        minute = int(match_time.group(2))
        period = match_time.group(3)
        if period == 'PM' and hour != 12:
            hour += 12
        elif period == 'AM' and hour == 12:
            hour = 0
        data['time'] = f"{hour:02d}:{minute:02d}:00"
    
    # Parse players (positions 1-4)
    players = {}
    idx = 2
    while idx < len(lines) and lines[idx] in ['1', '2', '3', '4']:
        pos = int(lines[idx])
        name = lines[idx + 1]
        score = lines[idx + 2]
        players[pos] = name
        idx += 3
    
    data['players'] = players
    data['p1'] = players.get(1, '')
    data['p2'] = players.get(2, '')
    data['p3'] = players.get(3, '')
    data['p4'] = players.get(4, '')
    
    # Find "MATCH RESULTS" and skip to sets
    match_results_idx = next((i for i, l in enumerate(lines[idx:], idx) if l == 'MATCH RESULTS'), -1)
    if match_results_idx == -1:
        raise ValueError("No MATCH RESULTS section found")
    
    idx = match_results_idx + 1
    
    # Parse 3 sets
    sets = []
    for set_num in range(1, 4):
        # Format: "Team1P1 & Team1P2" games "S#" games "Team2P1 & Team2P2"
        if idx >= len(lines):
            break
            
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
        
        sets.append({
            'team1_games': team1_games,
            'team2_games': team2_games
        })
    
    data['set1_t1'] = sets[0]['team1_games'] if len(sets) > 0 else 0
    data['set1_t2'] = sets[0]['team2_games'] if len(sets) > 0 else 0
    data['set2_t1'] = sets[1]['team1_games'] if len(sets) > 1 else 0
    data['set2_t2'] = sets[1]['team2_games'] if len(sets) > 1 else 0
    data['set3_t1'] = sets[2]['team1_games'] if len(sets) > 2 else 0
    data['set3_t2'] = sets[2]['team2_games'] if len(sets) > 2 else 0
    
    return data

def generate_sql(matches):
    """Generate SQL for inserting all matches."""
    sql = []
    sql.append("-- 52 completed matches from production (May 4 - Jul 25, 2026)")
    sql.append("-- Import into seed-demo.sql as section 13)")
    sql.append("")
    sql.append("WITH completed_matches_data(match_num, match_date, match_time, p1, p2, p3, p4, s1_t1_g, s1_t2_g, s2_t1_g, s2_t2_g, s3_t1_g, s3_t2_g) AS (")
    sql.append("  VALUES")
    
    for i, m in enumerate(matches):
        comma = ',' if i < len(matches) - 1 else ''
        line = f"    ({m['match_num']}, DATE '{m['date']}', TIME '{m['time']}', '{m['p1']}', '{m['p2']}', '{m['p3']}', '{m['p4']}', {m['set1_t1']}, {m['set1_t2']}, {m['set2_t1']}, {m['set2_t2']}, {m['set3_t1']}, {m['set3_t2']}){comma}"
        sql.append(line)
    
    sql.append("),")
    sql.append("active_season AS (")
    sql.append("  SELECT id FROM public.seasons WHERE is_active = true LIMIT 1")
    sql.append(")")
    sql.append("-- TODO: Create match records and match_pairings/match_sets with rotation logic")
    sql.append(";")
    
    return '\n'.join(sql)

if __name__ == '__main__':
    matches = parse_all_matches()
    print(f"\nTotal matches parsed: {len(matches)}")
    
    if matches:
        sql = generate_sql(matches)
        output_file = r'c:\SandeshTemp\Personal\PTC2.0\match_import_v2.sql'
        with open(output_file, 'w') as f:
            f.write(sql)
        print(f"SQL written to {output_file}")
        print("\nFirst 1000 chars of SQL:")
        print(sql[:1000])
