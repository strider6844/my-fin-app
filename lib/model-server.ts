// Server-side assembly of the forecast model for a company: pulls the driver
// config + actual series and builds all three scenarios.

import { getActualSeries } from "@/lib/data";
import { getModelConfig } from "@/lib/model-store";
import {
  buildForecast,
  timelineYears,
  SCENARIOS,
  type ForecastResult,
  type ModelConfig,
  type ScenarioName,
} from "@/lib/forecast";

export interface LoadedModel {
  config: ModelConfig;
  results: Record<ScenarioName, ForecastResult>;
  years: number[];
  hasActuals: boolean;
}

export async function loadModel(companyId: string): Promise<LoadedModel> {
  const [config, actuals] = await Promise.all([
    getModelConfig(companyId),
    getActualSeries(companyId),
  ]);

  const results = {} as Record<ScenarioName, ForecastResult>;
  for (const s of SCENARIOS) {
    results[s] = buildForecast(actuals, config, s);
  }
  return {
    config,
    results,
    years: timelineYears(results.Base),
    hasActuals: actuals.length > 0 && results.Base.actualPeriods.length > 0,
  };
}
