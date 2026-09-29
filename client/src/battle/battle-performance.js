(function (global) {
  "use strict";

  // Savaş performans bütçesi (docs/PERFORMANCE_BUDGET.md). Yayın kapısı
  // (server/app/mobile_release_gate.py) gerçek cihaz kanıtını aynı eşiklerle
  // denetler; biri değişirse diğeri de değişmelidir.
  const GRIDSHARD_PERFORMANCE_BUDGET = Object.freeze({
    minDurationMs: 15000,
    minFrames: 300,
    // 30 fps tabanı: iki dikey tarama süren kare (33,3 ms) ve zamanlama
    // oynaması geçer, üç taramaya uzayan kare geçmez.
    p95FrameMs: 34,
    jankFrameMs: 50,
    maxJankRatio: 0.03,
    freezeFrameMs: 1000,
    maxFreezes: 0,
  });

  // Kare süreleri 1 ms'lik kovalarda tutulur; uzun savaşta bellek büyümez.
  const HISTOGRAM_LIMIT_MS = 1000;
  const PROBE_INTERVAL_MS = 1000;

  function round(value, digits = 1) {
    const factor = 10 ** digits;
    return Math.round(Number(value || 0) * factor) / factor;
  }

  function evaluatePerformanceBudget(summary, budget = GRIDSHARD_PERFORMANCE_BUDGET) {
    const violations = [];
    if (!summary) {
      return { passed:false, violations:["missing_sample"] };
    }
    if (
      Number(summary.duration_ms || 0) < budget.minDurationMs
      || Number(summary.frame_count || 0) < budget.minFrames
    ) {
      violations.push("sample_too_short");
    }
    if (Number(summary.frame_ms_p95 || 0) > budget.p95FrameMs) {
      violations.push("p95_frame_time");
    }
    if (Number(summary.jank_ratio || 0) > budget.maxJankRatio) {
      violations.push("jank_ratio");
    }
    if (Number(summary.freeze_count || 0) > budget.maxFreezes) {
      violations.push("freeze");
    }
    return { passed:violations.length === 0, violations };
  }

  class GridshardBattlePerformanceSampler {
    constructor({
      budget = GRIDSHARD_PERFORMANCE_BUDGET,
      probe = null,
      memory = () => global.performance?.memory || null,
    } = {}) {
      this.budget = budget;
      // İsteğe bağlı sayaç: { effectNodes, domNodes } döndürür; saniyede bir çağrılır.
      this.probe = probe;
      this.memory = memory;
      this.active = false;
      this.context = {};
      this._reset();
    }

    _reset() {
      this.histogram = new Uint32Array(HISTOGRAM_LIMIT_MS + 1);
      this.frameCount = 0;
      this.durationMs = 0;
      this.maxFrameMs = 0;
      this.jankCount = 0;
      this.freezeCount = 0;
      this.effectNodesMax = 0;
      this.domNodesMax = 0;
      this.heapMbMax = null;
      this.lastFrameAt = null;
      this.lastProbeAt = null;
    }

    start(context = {}) {
      this._reset();
      this.context = { ...context };
      this.active = true;
    }

    // Sekme arka plana geçince animasyon durur; dönüşteki ilk aralık kare
    // süresi sayılmaz (yanlış "donma" üretmesin).
    suspend() {
      this.lastFrameAt = null;
    }

    frame(timestamp) {
      if (!this.active) return;
      const now = Number(timestamp);
      if (!Number.isFinite(now)) return;
      if (this.lastFrameAt !== null && now >= this.lastFrameAt) {
        const gap = now - this.lastFrameAt;
        this.frameCount += 1;
        this.durationMs += gap;
        this.maxFrameMs = Math.max(this.maxFrameMs, gap);
        this.histogram[Math.min(HISTOGRAM_LIMIT_MS, Math.floor(gap))] += 1;
        if (gap > this.budget.jankFrameMs) this.jankCount += 1;
        if (gap > this.budget.freezeFrameMs) this.freezeCount += 1;
      }
      this.lastFrameAt = now;
      if (this.lastProbeAt === null || now - this.lastProbeAt >= PROBE_INTERVAL_MS) {
        this.lastProbeAt = now;
        this._sampleProbe();
      }
    }

    _sampleProbe() {
      if (typeof this.probe === "function") {
        try {
          const sample = this.probe() || {};
          this.effectNodesMax = Math.max(this.effectNodesMax, Number(sample.effectNodes || 0));
          this.domNodesMax = Math.max(this.domNodesMax, Number(sample.domNodes || 0));
        } catch (_error) {
          // Ölçüm oyunu bozmamalı.
        }
      }
      try {
        const memory = typeof this.memory === "function" ? this.memory() : null;
        const used = Number(memory?.usedJSHeapSize);
        if (Number.isFinite(used) && used > 0) {
          this.heapMbMax = Math.max(this.heapMbMax || 0, used / 1048576);
        }
      } catch (_error) {
        // performance.memory yalnız Chromium'da var.
      }
    }

    _percentile(ratio) {
      if (!this.frameCount) return 0;
      const target = Math.max(1, Math.ceil(this.frameCount * ratio));
      let seen = 0;
      for (let bucket = 0; bucket < this.histogram.length; bucket += 1) {
        seen += this.histogram[bucket];
        if (seen < target) continue;
        // Taşma kovası en uzun kareyi, diğerleri [n, n+1) aralığının ortasını verir.
        if (bucket === HISTOGRAM_LIMIT_MS) return this.maxFrameMs;
        return Math.min(bucket + 0.5, this.maxFrameMs);
      }
      return this.maxFrameMs;
    }

    summary() {
      const frames = this.frameCount;
      const summary = {
        schema_version:1,
        ...this.context,
        duration_ms:Math.round(this.durationMs),
        frame_count:frames,
        fps_avg:this.durationMs > 0 ? round(frames * 1000 / this.durationMs) : 0,
        frame_ms_p50:round(this._percentile(0.5)),
        frame_ms_p95:round(this._percentile(0.95)),
        frame_ms_p99:round(this._percentile(0.99)),
        frame_ms_max:round(this.maxFrameMs),
        jank_count:this.jankCount,
        jank_ratio:frames ? round(this.jankCount / frames, 4) : 0,
        freeze_count:this.freezeCount,
        effect_nodes_max:this.effectNodesMax,
        dom_nodes_max:this.domNodesMax,
        js_heap_mb_max:this.heapMbMax === null ? null : round(this.heapMbMax),
      };
      const verdict = evaluatePerformanceBudget(summary, this.budget);
      summary.budget_passed = verdict.passed;
      // Telemetri şeması iç içe değer kabul etmez; ihlaller virgülle birleşir.
      summary.budget_violations = verdict.violations.join(",");
      return summary;
    }

    stop() {
      if (!this.active) return null;
      this.active = false;
      return this.summary();
    }
  }

  global.GRIDSHARD_PERFORMANCE_BUDGET = GRIDSHARD_PERFORMANCE_BUDGET;
  global.GridshardBattlePerformanceSampler = GridshardBattlePerformanceSampler;
  global.gridshardEvaluatePerformanceBudget = evaluatePerformanceBudget;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      GRIDSHARD_PERFORMANCE_BUDGET,
      GridshardBattlePerformanceSampler,
      evaluatePerformanceBudget,
    };
  }
})(typeof window !== "undefined" ? window : globalThis);

