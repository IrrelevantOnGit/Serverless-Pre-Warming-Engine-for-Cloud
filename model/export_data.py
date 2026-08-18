#!/usr/bin/env python3
"""
Traffic History Exporter / Generator for Model Training
Generates a multi-day time-series dataset of 1-minute time windows with diurnal seasonality and burst spikes.
"""

import json
import math
import os
import random

def generate_training_dataset(days=7, window_size_min=1, output_file="model/traffic_dataset.json"):
    print(f"=== Generating {days}-Day Time-Series Dataset ({window_size_min}-minute windows) ===")
    
    total_windows = (days * 24 * 60) // window_size_min
    records = []
    
    # Baseline traffic parameters
    base_rpm = 10  # 10 requests/min baseline
    peak_rpm = 120 # 120 requests/min peak
    
    for w in range(total_windows):
        total_minutes = w * window_size_min
        minute_of_day = total_minutes % (24 * 60)
        hour_of_day = minute_of_day / 60.0
        day_of_week = (total_minutes // (24 * 60)) % 7
        
        # Diurnal seasonality (peak at 14:00, trough at 04:00)
        seasonality = 0.5 + 0.5 * math.sin((hour_of_day - 8.0) * math.pi / 12.0)
        expected_rate = base_rpm + (peak_rpm - base_rpm) * seasonality
        
        # Inject random burst spikes (5% probability)
        is_spike = random.random() < 0.05
        burst_multiplier = random.uniform(3.0, 6.0) if is_spike else 1.0
        
        # Add random noise
        count = int(max(0, random.gauss(expected_rate * burst_multiplier, expected_rate * 0.15)))
        
        records.append({
            "window_index": w,
            "day_of_week": day_of_week,
            "hour_of_day": round(hour_of_day, 2),
            "count": count,
            "is_spike": 1 if count > 60 else 0
        })

    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, "w") as f:
        json.dump(records, f, indent=2)

    print(f"Dataset generated: {len(records)} windows saved to {output_file}")
    return output_file

if __name__ == "__main__":
    generate_training_dataset()
