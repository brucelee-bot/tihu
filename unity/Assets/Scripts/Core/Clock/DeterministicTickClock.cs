using System;
using UnityEngine;

namespace ShadowGrudge.Core.Clock
{
    /// <summary>
    /// VS-00 transition clock. Gameplay subscribers run before the single
    /// manual Physics.Simulate call, then observe the completed physics step.
    /// </summary>
    public sealed class DeterministicTickClock : MonoBehaviour
    {
        [SerializeField, Min(1f)] private float tickRate = 30f;
        [SerializeField, Min(1)] private int maxTicksPerFrame = 4;

        public event Action<int> BeforePhysicsTick;
        public event Action<int> AfterPhysicsTick;
        public int TickIndex { get; private set; }
        public float TickDelta => 1f / tickRate;

        private float accumulator;

        private void Awake()
        {
            Time.fixedDeltaTime = TickDelta;
            Physics.autoSimulation = false;
        }

        private void Update()
        {
            accumulator += Time.unscaledDeltaTime;
            var ticks = 0;
            while (accumulator >= TickDelta && ticks++ < maxTicksPerFrame)
            {
                accumulator -= TickDelta;
                TickIndex++;
                BeforePhysicsTick?.Invoke(TickIndex);
                if (!Physics.autoSimulation)
                {
                    Physics.Simulate(TickDelta);
                }
                AfterPhysicsTick?.Invoke(TickIndex);
            }

            // Never catch up an unbounded backlog after an iPhone hitch. The
            // next frame starts from a bounded accumulator, preserving input
            // ordering and avoiding a visible simulation spiral.
            if (ticks >= maxTicksPerFrame && accumulator > TickDelta * maxTicksPerFrame)
            {
                accumulator = TickDelta * maxTicksPerFrame;
            }
        }

        private void OnDestroy()
        {
            Physics.autoSimulation = true;
        }
    }
}
