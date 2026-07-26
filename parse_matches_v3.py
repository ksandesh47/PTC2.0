#!/usr/bin/env python3
"""
Parse match results properly by reading the full structure.
"""

import re

def parse_matches_from_text():
    """Parse matches by identifying the repeating pattern."""
    with open(r'c:\Users\SKhatiwada\AppData\Roaming\Code\User\workspaceStorage\41f13b5d9d9a1011595a2d96510d99f5\GitHub.copilot-chat\chat-session-resources\f2a85d6a-3c58-409b-b414-4d27caabdc7d\toolu_bdrk_01SBmbCDwNFstNpnaFHkzezd__vscode-1785024093178\content.txt', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all matches using a comprehensive regex
    # Pattern: <date> <time> ✓ Completed · Match #<num> <4 players> MATCH RESULTS <3 sets>
    pattern = r'(\w+,\s+\w+\s+\d+)\s*\n(\d+:\d+\s+(?:AM|PM))\s*\n✓ Completed · Match #(\d+)\s*\n((?:(?!Completed · Match #).)*?)(?=(?:\w+,\s+\w+\s+\d+\s*\n\d+:\d+)|$)'
    
    matches_list = []
    for match_obj in re.finditer(pattern, content, re.DOTALL):
        date_str = match_obj.group(1)
        time_str = match_obj.group(2)
        match_num = int(match_obj.group(3))
        match_body = match_obj.group(4)
        
        parsed = {
            'date': date_str,
            'time': time_str,
            'num': match_num,
        }
        
        # Extract player data from body
        lines = [l.strip() for l in match_body.split('\n') if l.strip()]
        
        players = {}
        idx = 0
        while idx < len(lines) and lines[idx] in ['1', '2', '3', '4']:
            pos = int(lines[idx])
            name = lines[idx + 1] if idx + 1 < len(lines) else ''
            score = lines[idx + 2] if idx + 2 < len(lines) else ''
            players[pos] = name
            idx += 3
        
        parsed['p1'] = players.get(1, '')
        parsed['p2'] = players.get(2, '')
        parsed['p3'] = players.get(3, '')
        parsed['p4'] = players.get(4, '')
        
        # Find MATCH RESULTS section
        results_idx = next((i for i, l in enumerate(lines[idx:], idx) if 'MATCH RESULTS' in l), -1)
        if results_idx > -1:
            idx = results_idx + 1
            sets = []
            for s in range(3):
                if idx + 4 < len(lines):
                    # team1_games S# team2_games
                    t1_g = int(lines[idx]) if lines[idx].isdigit() else 0
                    s_label = lines[idx + 1] if 'S' in lines[idx + 1] else ''
                    t2_g = int(lines[idx + 2]) if idx + 2 < len(lines) and lines[idx + 2].isdigit() else 0
                    sets.append({'t1': t1_g, 't2': t2_g})
                    idx += 3
        
            parsed['s1_t1'] = sets[0]['t1'] if len(sets) > 0 else 0
            parsed['s1_t2'] = sets[0]['t2'] if len(sets) > 0 else 0
            parsed['s2_t1'] = sets[1]['t1'] if len(sets) > 1 else 0
            parsed['s2_t2'] = sets[1]['t2'] if len(sets) > 1 else 0
            parsed['s3_t1'] = sets[2]['t1'] if len(sets) > 2 else 0
            parsed['s3_t2'] = sets[2]['t2'] if len(sets) > 2 else 0
        
        matches_list.append(parsed)
        print(f"✓ Match #{parsed['num']}: {parsed['date']} {parsed['time']} - {parsed['p1']}, {parsed['p2']}, {parsed['p3']}, {parsed['p4']}")
    
    return matches_list

def format_date_sql(date_str):
    """Convert 'Sat, Jul 25' to '2026-07-25'."""
    months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    }
    parts = date_str.split(',')[1].strip().split()  # Get "Jul 25" part
    month_name = parts[0]
    day = parts[1]
    month = months.get(month_name, '01')
    return f"2026-{month}-{day.zfill(2)}"

if __name__ == '__main__':
    matches = parse_matches_from_text()
    print(f"\nTotal matches found: {len(matches)}")
    
    # Generate SQL
    if matches:
        sql_lines = [
            "-- 52 completed matches (May 4 - Jul 25, 2026)",
            "WITH match_data(match_num, match_date, match_time, p1, p2, p3, p4, s1_t1_g, s1_t2_g, s2_t1_g, s2_t2_g, s3_t1_g, s3_t2_g) AS (",
            "  VALUES"
        ]
        
        for i, m in enumerate(matches):
            date_sql = format_date_sql(m['date'])
            time_12 = m['time']
            # Convert 12-hour time to 24-hour for SQL
            time_parts = time_12.split()
            hour_min = time_parts[0].split(':')
            hour = int(hour_min[0])
            minute = hour_min[1]
            period = time_parts[1]
            
            if period == 'PM' and hour != 12:
                hour += 12
            elif period == 'AM' and hour == 12:
                hour = 0
            
            time_sql = f"{hour:02d}:{minute}:00"
            
            comma = ',' if i < len(matches) - 1 else ''
            line = f"    ({m['num']}, DATE '{date_sql}', TIME '{time_sql}', '{m['p1']}', '{m['p2']}', '{m['p3']}', '{m['p4']}', {m['s1_t1']}, {m['s1_t2']}, {m['s2_t1']}, {m['s2_t2']}, {m['s3_t1']}, {m['s3_t2']}){comma}"
            sql_lines.append(line)
        
        sql_lines.extend([
            ");",
            "-- TODO: Convert match_data into matches, match_pairings, and match_sets records"
        ])
        
        sql = '\n'.join(sql_lines)
        
        with open(r'c:\SandeshTemp\Personal\PTC2.0\match_data.sql', 'w') as f:
            f.write(sql)
        
        print("\nSQL generated successfully!")
        print("First 50 lines:")
        print('\n'.join(sql_lines[:50]))
