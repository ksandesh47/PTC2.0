#!/usr/bin/env python3
"""
Simple line-by-line parser for match data.
"""

def parse_all_matches():
    """Parse matches by reading line by line."""
    with open(r'c:\Users\SKhatiwada\AppData\Roaming\Code\User\workspaceStorage\41f13b5d9d9a1011595a2d96510d99f5\GitHub.copilot-chat\chat-session-resources\f2a85d6a-3c58-409b-b414-4d27caabdc7d\toolu_bdrk_01SBmbCDwNFstNpnaFHkzezd__vscode-1785024093178\content.txt', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split by literal backslash-n (not actual newlines)
    lines = content.split('\\n')
    
    print(f"Total lines: {len(lines)}")
    
    # Remove leading lines until we find the first match
    start_idx = 0
    for i, line in enumerate(lines):
        if 'Sat, Jul 25' in line:
            start_idx = i
            break
    
    print(f"Starting parse from line {start_idx}")
    
    matches = []
    i = start_idx
    
    while i < len(lines) - 3:
        line = lines[i].strip()
        
        # Look for date pattern (Day, Month Day)
        if any(day in line for day in ['Mon,', 'Tue,', 'Wed,', 'Thu,', 'Fri,', 'Sat,', 'Sun,']):
            date_str = line
            if i + 1 >= len(lines):
                break
            time_str = lines[i + 1].strip()
            if i + 2 >= len(lines):
                break
            match_label = lines[i + 2].strip()  # "✓ Completed · Match #52"
            
            # Extract match number
            import re
            match_num_match = re.search(r'Match #(\d+)', match_label)
            if not match_num_match:
                i += 1
                continue
            
            match_num = int(match_num_match.group(1))
            i += 3
            
            # Parse 4 players
            players = {}
            try:
                for _ in range(4):
                    if i + 2 >= len(lines):
                        raise IndexError("Not enough lines for player data")
                    pos = int(lines[i].strip())
                    name = lines[i + 1].strip()
                    score = int(lines[i + 2].strip())
                    players[pos] = name
                    i += 3
                
                # Skip to "MATCH RESULTS"
                while i < len(lines) and 'MATCH RESULTS' not in lines[i]:
                    i += 1
                if i >= len(lines):
                    continue
                i += 1  # Skip the MATCH RESULTS line
                
                # Parse 3 sets
                sets = []
                for set_num in range(3):
                    if i + 4 >= len(lines):
                        break
                    # Line format: "Team1 & Team2"
                    team1_line = lines[i].strip()
                    i += 1
                    # Games line
                    team1_games = int(lines[i].strip())
                    i += 1
                    # S# line
                    s_label = lines[i].strip()
                    i += 1
                    # Team2 games
                    team2_games = int(lines[i].strip())
                    i += 1
                    # Team2 line
                    team2_line = lines[i].strip()
                    i += 1
                    
                    sets.append({
                        't1_games': team1_games,
                        't2_games': team2_games
                    })
                
                match_data = {
                    'num': match_num,
                    'date': date_str,
                    'time': time_str,
                    'p1': players.get(1, ''),
                    'p2': players.get(2, ''),
                    'p3': players.get(3, ''),
                    'p4': players.get(4, ''),
                    's1_t1': sets[0]['t1_games'] if len(sets) > 0 else 0,
                    's1_t2': sets[0]['t2_games'] if len(sets) > 0 else 0,
                    's2_t1': sets[1]['t1_games'] if len(sets) > 1 else 0,
                    's2_t2': sets[1]['t2_games'] if len(sets) > 1 else 0,
                    's3_t1': sets[2]['t1_games'] if len(sets) > 2 else 0,
                    's3_t2': sets[2]['t2_games'] if len(sets) > 2 else 0,
                }
                
                matches.append(match_data)
                print(f"✓ Match #{match_num}: {date_str} {time_str}")
            except Exception as e:
                print(f"✗ Error parsing match #{match_num}: {e}")
                i += 1
        else:
            i += 1
    
    return matches

def format_date_sql(date_str):
    """Convert 'Sat, Jul 25' to '2026-07-25'."""
    import re
    months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    }
    match = re.search(r'(\w+)\s+(\d+)', date_str)
    if match:
        month_name = match.group(1)
        day = match.group(2)
        month = months.get(month_name, '01')
        return f"2026-{month}-{day.zfill(2)}"
    return "2026-01-01"

def format_time_24h(time_str):
    """Convert '5:30 PM' to '17:30:00'."""
    import re
    match = re.match(r'(\d+):(\d+)\s+(AM|PM)', time_str)
    if match:
        hour = int(match.group(1))
        minute = match.group(2)
        period = match.group(3)
        
        if period == 'PM' and hour != 12:
            hour += 12
        elif period == 'AM' and hour == 12:
            hour = 0
        
        return f"{hour:02d}:{minute}:00"
    return "17:30:00"

if __name__ == '__main__':
    matches = parse_all_matches()
    print(f"\nTotal matches parsed: {len(matches)}")
    
    if matches:
        # Generate SQL
        sql_lines = [
            "-- 52 completed matches (May 4 - Jul 25, 2026)",
            "-- Parsed from production PTC app",
            "WITH match_data(match_num, match_date, match_time, p1, p2, p3, p4, s1_t1_g, s1_t2_g, s2_t1_g, s2_t2_g, s3_t1_g, s3_t2_g) AS (",
            "  VALUES"
        ]
        
        for i, m in enumerate(matches):
            date_sql = format_date_sql(m['date'])
            time_sql = format_time_24h(m['time'])
            
            comma = ',' if i < len(matches) - 1 else ''
            line = f"    ({m['num']}, DATE '{date_sql}', TIME '{time_sql}', '{m['p1']}', '{m['p2']}', '{m['p3']}', '{m['p4']}', {m['s1_t1']}, {m['s1_t2']}, {m['s2_t1']}, {m['s2_t2']}, {m['s3_t1']}, {m['s3_t2']}){comma}"
            sql_lines.append(line)
        
        sql_lines.extend([
            ");",
            "-- TODO: Use this data to create matches, match_pairings, and match_sets records",
            "-- with proper rotation logic for team assignments"
        ])
        
        sql = '\n'.join(sql_lines)
        
        output_file = r'c:\SandeshTemp\Personal\PTC2.0\match_data_parsed.sql'
        with open(output_file, 'w') as f:
            f.write(sql)
        
        print(f"\nSQL written to match_data_parsed.sql")
        print("\nFirst 40 lines:")
        for line in sql_lines[:40]:
            print(line)
