import csv
import datetime
import random

# Seed for reproducible realistic synthetic data
random.seed(42)

VESSEL_NAMES = [
    ("MSC Michel Cappellini", "ULCV", 24346),
    ("Ever Alot", "ULCV", 24004),
    ("OOCL Spain", "ULCV", 24188),
    ("ONE Innovation", "ULCV", 24136),
    ("CMA CGM Jacques Saade", "ULCV", 23112),
    ("HMM Algeciras", "ULCV", 23964),
    ("Madrid Maersk", "ULCV", 20568),
    ("Cosco Shipping Universe", "ULCV", 21237),
    ("Ever Golden", "ULCV", 20124),
    ("MSC Gulsun", "ULCV", 23756),
    ("CMA CGM Palais Royal", "ULCV", 23000),
    ("Hapag-Lloyd Berlin Express", "ULCV", 23664),
    ("Maersk Mc-Kinney Moller", "ULCV", 18270),
    ("ZIM Mount Everest", "New Panamax", 15250),
    ("CMA CGM Tenere", "New Panamax", 14812),
    ("ONE Apus", "New Panamax", 14052),
    ("Ever Forever", "New Panamax", 12118),
    ("MSC Orion", "New Panamax", 15000),
    ("Maersk Hidalgo", "New Panamax", 15200),
    ("Cosco Harmony", "New Panamax", 14500),
    ("Yang Ming Wellhead", "New Panamax", 14000),
    ("Hyundai Dream", "Post-Panamax", 13100),
    ("CMA CGM Amerigo Vespucci", "Post-Panamax", 13800),
    ("Maersk Edinburg", "Post-Panamax", 13092),
    ("MSC Viviana", "Post-Panamax", 11500),
    ("Ever United", "Post-Panamax", 11000),
    ("APL Dublin", "Post-Panamax", 10700),
    ("Hapag-Lloyd Valparaiso Express", "Post-Panamax", 10500),
    ("OOCL Genoa", "Post-Panamax", 8888),
    ("Maersk Gateshead", "Post-Panamax", 8500),
    ("Cosco Venice", "Post-Panamax", 8500),
    ("CMA CGM Rhone", "Post-Panamax", 9365),
    ("MSC Danit", "Post-Panamax", 14000),
    ("WEC Vermeer", "Feedermax", 1800),
    ("BG Freight Rotterdam", "Feedermax", 1300),
    ("Unifeeder Baltic", "Feedermax", 2100),
    ("Samskip Innovator", "Feedermax", 1400),
    ("X-Press Elbe", "Feedermax", 1740),
    ("CMA CGM Saint Laurent", "Handysize Container", 2200),
    ("Maersk Nacka", "Feedermax", 1600),
    ("DFDS Hollandia", "Handysize Container", 2500),
    ("Containerships VI", "Feedermax", 1400),
    ("Encounter", "Feedermax", 1200),
    ("A2B Future", "Feedermax", 650),
    ("Elbfeeder", "Feedermax", 1000),
    ("Finnwave", "Handysize Container", 2800),
    ("JSP Rider", "Feedermax", 800),
    ("Vega Alpha", "Feedermax", 1118),
    ("Ida Rambow", "Feedermax", 1000),
    ("Vera Rambow", "Feedermax", 1000),
    ("ONE Continuity", "Post-Panamax", 8100),
    ("MSC Eloane", "ULCV", 19200),
    ("CMA CGM Jules Verne", "ULCV", 16020),
    ("Maersk Madrid", "ULCV", 20568),
    ("Cosco Netherlands", "ULCV", 13386),
    ("Ever Safety", "Post-Panamax", 8452),
    ("Hapag-Lloyd Santos Express", "Post-Panamax", 10500),
    ("Yang Ming Warranty", "New Panamax", 14220),
    ("ONE Integrity", "ULCV", 24000),
    ("MSC Loreto", "ULCV", 24346),
]

PORTS = [
    ("Port of Rotterdam", "Maasvlakte 2"),
    ("Port of Rotterdam", "Delta Dedicated North"),
    ("Port of Rotterdam", "Euromax Terminal"),
    ("Port of Rotterdam", "APM Terminals Maasvlakte"),
    ("Antwerp Gateway", "Deurganckdock"),
    ("Hamburg Terminal", "Burchardkai"),
    ("Felixstowe Ocean Port", "Trinity Terminal"),
]

BERTHS = ["B01", "B02", "B03", "B04", "B05", "B06"]
ROUTES = ["Asia-North Europe AE1", "Transatlantic TA2", "Intra-Europe Feeder F1", "Asia-Med-Europe MD2", "Baltic Feeder BF4"]
SHIFTS = ["Morning (06:00-14:00)", "Evening (14:00-22:00)", "Night (22:00-06:00)"]
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

WEATHER_CONDITIONS = [
    ("Clear / Calm", 0.05, 1.0),
    ("Light Breeze", 0.15, 1.02),
    ("Moderate Wind", 0.35, 1.08),
    ("Dense Coastal Fog", 0.55, 1.18),
    ("Squall / High Swell", 0.75, 1.30),
    ("Gale Force Storm", 0.92, 1.55),
]

def generate_records():
    records = []
    base_time = datetime.datetime(2026, 10, 6, 8, 0, 0)
    
    # 60 records partitioned into 3 balanced operational regimes:
    # 0..19: Low congestion
    # 20..39: Medium congestion
    # 40..59: High congestion
    
    for i in range(60):
        vessel_name, vessel_type, nominal_teu = VESSEL_NAMES[i]
        vessel_id = f"VES-{1001 + i}"
        record_id = f"REC-2026-{10001 + i}"
        port, terminal = PORTS[i % len(PORTS)]
        berth_id = BERTHS[i % len(BERTHS)]
        route = ROUTES[i % len(ROUTES)]
        shift = SHIFTS[i % len(SHIFTS)]
        
        # Arrival time staggered across days/hours
        arrival_dt = base_time + datetime.timedelta(hours=i * 2.5 - 30)
        arrival_time_str = arrival_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        day_of_week = DAYS[arrival_dt.weekday()]
        hour = arrival_dt.hour
        
        # Determine regime
        if i < 20:
            regime = "Low"
        elif i < 40:
            regime = "Medium"
        else:
            regime = "High"
            
        if regime == "Low":
            # Low congestion characteristics:
            # high crane availability, fast turnaround, low wait, calm weather
            berth_util = round(random.uniform(42.0, 64.0), 1)
            crane_count = random.choice([4, 5, 6])
            cranes_avail = crane_count - random.choice([0, 1])
            crane_util = round(random.uniform(55.0, 75.0), 1)
            vessel_queue = random.choice([0, 1, 2])
            truck_count = random.randint(30, 65)
            truck_queue = random.randint(4, 18)
            waiting_time_hours = round(random.uniform(0.8, 3.8) + (vessel_queue * 0.9), 1)
            weather_choice = WEATHER_CONDITIONS[random.choice([0, 1])]
            historical_avg_wait = round(random.uniform(3.5, 5.0), 1)
            congestion_score = round(random.uniform(18.0, 38.0), 1)
            congestion_level = "Low"
            op_status = random.choice(["Berthed", "Departed", "Under Operation"])
            
        elif regime == "Medium":
            # Medium congestion:
            # moderate utilization, slight queue, mild weather friction
            berth_util = round(random.uniform(68.0, 82.0), 1)
            crane_count = random.choice([3, 4, 5])
            cranes_avail = max(1, crane_count - random.choice([1, 2]))
            crane_util = round(random.uniform(76.0, 88.0), 1)
            vessel_queue = random.choice([3, 4, 5])
            truck_count = random.randint(70, 120)
            truck_queue = random.randint(28, 55)
            waiting_time_hours = round(random.uniform(5.5, 9.8) + (vessel_queue * 0.8), 1)
            weather_choice = WEATHER_CONDITIONS[random.choice([1, 2, 3])]
            historical_avg_wait = round(random.uniform(7.5, 11.0), 1)
            congestion_score = round(random.uniform(48.0, 68.0), 1)
            congestion_level = "Medium"
            op_status = random.choice(["Berthed", "At Anchor", "Under Operation", "Arriving"])
            
        else: # High
            # High congestion:
            # severe queues, crane outages, heavy truck backlog, squall/storms
            berth_util = round(random.uniform(86.0, 98.5), 1)
            crane_count = random.choice([2, 3, 4])
            cranes_avail = max(1, crane_count - random.choice([2, 3])) # severe crane bottleneck
            crane_util = round(random.uniform(90.0, 99.0), 1)
            vessel_queue = random.randint(6, 12)
            truck_count = random.randint(130, 210)
            truck_queue = random.randint(65, 140)
            waiting_time_hours = round(random.uniform(13.5, 26.0) + (vessel_queue * 1.2), 1)
            weather_choice = WEATHER_CONDITIONS[random.choice([3, 4, 5])]
            historical_avg_wait = round(random.uniform(14.0, 20.0), 1)
            congestion_score = round(random.uniform(74.0, 96.0), 1)
            congestion_level = "High" if congestion_score < 85 else "Critical"
            op_status = random.choice(["At Anchor", "Awaiting Berth", "Delayed", "Congestion Hold"])

        # Correlated container count based on vessel type
        container_factor = random.uniform(0.65, 0.95)
        container_count = int(nominal_teu * container_factor)
        pending_ratio = random.uniform(0.15, 0.85) if op_status != "Departed" else 0.0
        containers_pending = int(container_count * pending_ratio)

        # Operational calculation of turnaround time:
        # Handling hours = containers / (effective cranes * moves_per_hour) * weather_factor
        moves_per_crane_hr = 28.0
        effective_speed = max(1, cranes_avail) * moves_per_crane_hr
        handling_hours = (container_count / effective_speed) * weather_choice[2]
        turnaround_hours = round(waiting_time_hours + handling_hours + 1.5, 1)

        # Realistic ETD vs Estimated ETD calculation
        est_etd_dt = arrival_dt + datetime.timedelta(hours=turnaround_hours)
        estimated_etd_str = est_etd_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        # In ~40% of records (especially incoming/anchor vessels), actual ETD is unconfirmed (blank)
        # In the remaining ~60%, actual operational ETD was filed by the carrier
        has_actual_etd = (i % 5 != 0) and (op_status != "Arriving" and op_status != "Awaiting Berth")
        if has_actual_etd:
            # Slight operational variance between estimated and filed ETD
            diff_hours = random.uniform(-2.5, 4.0)
            act_etd_dt = est_etd_dt + datetime.timedelta(hours=diff_hours)
            actual_etd_str = act_etd_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        else:
            actual_etd_str = "" # Unprovided ETD, transparently handled by system estimation!

        records.append({
            "record_id": record_id,
            "vessel_id": vessel_id,
            "vessel_name": vessel_name,
            "vessel_type": vessel_type,
            "port": port,
            "terminal": terminal,
            "arrival_time": arrival_time_str,
            "etd": actual_etd_str,
            "estimated_etd": estimated_etd_str,
            "turnaround_time_hours": turnaround_hours,
            "container_count": container_count,
            "containers_pending": containers_pending,
            "berth_id": berth_id,
            "berth_utilization": berth_util,
            "crane_count": crane_count,
            "cranes_available": cranes_avail,
            "crane_utilization": crane_util,
            "truck_count": truck_count,
            "truck_queue": truck_queue,
            "vessel_queue": vessel_queue,
            "waiting_time_hours": waiting_time_hours,
            "weather_condition": weather_choice[0],
            "weather_severity": weather_choice[1],
            "congestion_level": congestion_level,
            "congestion_score": congestion_score,
            "historical_avg_wait": historical_avg_wait,
            "route": route,
            "shift": shift,
            "day_of_week": day_of_week,
            "hour": hour,
            "operational_status": op_status,
        })
        
    return records

if __name__ == "__main__":
    records = generate_records()
    fieldnames = list(records[0].keys())
    
    # Save to root port_operations_demo.csv
    with open("port_operations_demo.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)
        
    # Save to src/frontend/public/port_operations_demo.csv for direct web serving
    with open("src/frontend/public/port_operations_demo.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f"Successfully generated {len(records)} correlated port operations records.")
