# Port Operations Dataset Data Dictionary
**Document:** Operational Schema & Field Specifications  
**Dataset:** `port_operations_demo.csv`  
**Application:** PortsPilot AI / Varuna Terminal Operating & Congestion Prediction System  
**Version:** 2.4 Enterprise  

---

## 1. Overview & Purpose
This dataset models high-frequency marine terminal and quayside operational telemetry across container vessel movements, crane assignments, gate truck flows, yard buffer saturation, and atmospheric conditions. It provides the grounding data for PortsPilot AI's 72-hour congestion forecasting, What-If simulation engine, and ETD turnaround estimator.

The dataset includes 60 correlated records stratified across three distinct operational regimes:
1. **Low Congestion (Records 1–20):** Fluid quayside throughput, 40%–65% berth occupancy, high crane availability (4–6 per berth), minimal anchor queues (0–2 vessels), wait times < 5 hours.
2. **Medium Congestion (Records 21–40):** Elevated cargo volumes, 65%–82% berth occupancy, minor maintenance crane bottlenecks, anchor queues of 3–5 vessels, wait times 6–12 hours.
3. **High / Critical Congestion (Records 41–60):** Severe bottlenecks, 86%–98% berth occupancy, crane outages (only 1–2 operational cranes), storm/squall disruptions, anchor queues of 6–12 vessels, truck queues > 65, wait times exceeding 20–35 hours.

---

## 2. Entity Field Dictionary

| Column Name | Data Type | Units / Format | Allowed Range / Domain | Nullable / Optional | Description & Domain Logic |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `record_id` | String | Format: `REC-YYYY-XXXXX` | Unique String | **No** | Unique primary key identifying the operational observation snapshot. |
| `vessel_id` | String | Format: `VES-XXXX` | Unique String | **No** | Terminal Operating System (TOS) unique identifier for the ship call. |
| `vessel_name` | String | Text | Commercial vessel names | **No** | Registered name of the container ship (e.g., *Ever Alot*, *MSC Michel Cappellini*). |
| `vessel_type` | String | Categorical | `ULCV`, `New Panamax`, `Post-Panamax`, `Feedermax`, `Handysize Container` | **No** | Structural classification determining deadweight tonnage and nominal capacity. |
| `port` | String | Text | E.g., `Port of Rotterdam`, `Antwerp Gateway`, `Hamburg Terminal` | **No** | Port facility authority governing the terminal water jurisdiction. |
| `terminal` | String | Text | E.g., `Maasvlakte 2`, `Delta Dedicated North`, `Euromax Terminal` | **No** | Specific terminal operating complex within the port. |
| `arrival_time` | ISO 8601 Timestamp | `YYYY-MM-DDTHH:MM:SSZ` | UTC Timestamps | **No** | Confirmed pilot boarding time or vessel anchor drop time at the port limits. |
| `etd` | ISO 8601 Timestamp | `YYYY-MM-DDTHH:MM:SSZ` | UTC Timestamps or Empty | **Yes (Optional)** | **Actual / Filed ETD**: Carrier-declared unberthing departure time. **Optional by design**—unberthed vessels in queue do not have a confirmed actual ETD. |
| `estimated_etd` | ISO 8601 Timestamp | `YYYY-MM-DDTHH:MM:SSZ` | UTC Timestamps | **No** | **System Estimated ETD**: Transparently calculated by the AI engine from container volume, crane rate, berth wait, and weather friction. |
| `turnaround_time_hours` | Decimal | Hours (h) | 12.0 – 900.0 | **No** | Total elapsed port turnaround: $T_{\text{turnaround}} = T_{\text{wait}} + T_{\text{handling}} + T_{\text{unberth buffer}}$. |
| `container_count` | Integer | TEU | 400 – 24,000 | **No** | Total import, export, and transshipment container moves manifested for the call. |
| `containers_pending` | Integer | TEU | 0 – 24,000 | **No** | Remaining container boxes still awaiting crane lift or quay crane discharge. |
| `berth_id` | String | Categorical | `B01`, `B02`, `B03`, `B04`, `B05`, `B06` | **No** | Assigned quayside quay/berth pocket. |
| `berth_utilization` | Decimal | Percentage (%) | 0.0 – 100.0% | **No** | Time-weighted occupancy percentage of the specific berth pocket. |
| `crane_count` | Integer | Count | 2 – 6 | **No** | Total Ship-to-Shore (STS) gantry cranes mechanically installed on the berth. |
| `cranes_available` | Integer | Count | 1 – 6 | **No** | Number of STS gantry cranes actively operational (crane_count minus breakdown). |
| `crane_utilization` | Decimal | Percentage (%) | 40.0 – 100.0% | **No** | Percentage of STS crane operational shift capacity utilized in active hoist cycles. |
| `truck_count` | Integer | Count | 20 – 300 | **No** | Total terminal tractor and external drayage trucks logged at the gate complex. |
| `truck_queue` | Integer | Count | 0 – 200 | **No** | Number of drayage trucks waiting in the landside gate queuing lanes outside pedestals. |
| `vessel_queue` | Integer | Count | 0 – 25 | **No** | Number of vessels drifting or anchored in the roadstead awaiting berth clearance. |
| `waiting_time_hours` | Decimal | Hours (h) | 0.5 – 50.0 | **No** | Elapsed or projected roadstead anchorage waiting duration prior to first line fast. |
| `weather_condition` | String | Categorical | `Clear / Calm`, `Light Breeze`, `Moderate Wind`, `Dense Coastal Fog`, `Squall / High Swell`, `Gale Force Storm` | **No** | Prevailing meteorological condition impacting marine pilotage and crane safety limits. |
| `weather_severity` | Decimal | Scalar (0.0 – 1.0) | 0.00 – 1.00 | **No** | Normalized atmospheric friction index where >0.70 prompts crane wind alarms (>20 m/s). |
| `congestion_level` | String | Categorical | `Low`, `Medium`, `High`, `Critical` | **No** | Standard operational classification of port bottleneck severity. |
| `congestion_score` | Decimal | Index (0 – 100) | 0.0 – 100.0 | **No** | Composite multi-factor congestion index derived from berth, crane, queue, and weather factors. |
| `historical_avg_wait` | Decimal | Hours (h) | 2.0 – 25.0 | **No** | 30-day trailing baseline average waiting time for vessels of this class at this berth. |
| `route` | String | Categorical | `Asia-North Europe AE1`, `Transatlantic TA2`, `Intra-Europe Feeder F1`, `Asia-Med-Europe MD2`, `Baltic Feeder BF4` | **No** | Liner shipping consortium service loop or feeder rotation. |
| `shift` | String | Categorical | `Morning (06:00-14:00)`, `Evening (14:00-22:00)`, `Night (22:00-06:00)` | **No** | Active 8-hour stevedore labor shift period. |
| `day_of_week` | String | Categorical | `Monday` to `Sunday` | **No** | Day of the week for weekly arrival seasonality analysis. |
| `hour` | Integer | Hour (0 – 23) | 0 – 23 | **No** | Hour of arrival in 24-hour UTC military format. |
| `operational_status` | String | Categorical | `Berthed`, `At Anchor`, `Under Operation`, `Arriving`, `Departed`, `Awaiting Berth`, `Delayed`, `Congestion Hold` | **No** | Current operational state of the vessel within the port domain. |

---

## 3. Mathematical & Domain Relationships
1. **Handling Duration ($T_{\text{handling}}$):**
   $$T_{\text{handling}} = \frac{\text{container\_count}}{\max(1, \text{cranes\_available}) \times 28 \text{ moves/hr}} \times (1 + \text{weather\_severity} \times 0.6)$$
2. **Turnaround Time ($T_{\text{turnaround}}$):**
   $$T_{\text{turnaround}} = T_{\text{wait}} + T_{\text{handling}} + 1.5\text{h (mooring/unmooring buffer)}$$
3. **Estimated ETD vs Actual ETD:**
   - If carrier provides confirmed operational schedule $\rightarrow \text{Actual ETD}$ is preserved.
   - If unconfirmed or in anchor queue $\rightarrow \text{ETD}$ is omitted (`""`), and system calculates:
     $$\text{Estimated ETD} = \text{arrival\_time} + T_{\text{turnaround}}$$
4. **Physical Plausibility Constraints:**
   - $\text{cranes\_available} \le \text{crane\_count}$
   - $\text{containers\_pending} \le \text{container\_count}$
   - Low congestion ($\text{score} < 40$) cannot co-occur with high wait times ($> 10\text{h}$) or gale storm winds ($\text{severity} > 0.70$).
   - High congestion ($\text{score} > 75$) is directly backed by identifiable root causes: crane outages, berth saturation $>85\%$, or heavy weather.
