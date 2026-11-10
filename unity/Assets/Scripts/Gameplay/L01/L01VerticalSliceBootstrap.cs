using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using ShadowGrudge.Core.Clock;

namespace ShadowGrudge.Gameplay.L01
{
    [Serializable]
    public sealed class L01LevelDefinition
    {
        public int schemaVersion = 1;
        public string levelId = "L01";
        public string legacyLevelId = "1";
        public float sourceUnitScale = 0.01f;
        public LegacyCanvas legacyCanvas = new LegacyCanvas();
        public PlayerData player = new PlayerData();
        public ShadowData shadow = new ShadowData();
        public PlateData[] plates = { new PlateData() };
        public DoorData[] doors = { new DoorData() };
        public GoalData goal = new GoalData();

        [Serializable] public sealed class LegacyCanvas { public float width = 960f; public float height = 540f; public float groundY = 472f; }
        [Serializable] public sealed class PlayerData { public float startX = 64f; public float startYFromGround = 44f; public float width = 34f; public float height = 44f; }
        [Serializable] public sealed class ShadowData { public int legacyDelayFrames = 180; public float shadowDelaySeconds = 3f; public int shadowDelayTicks = 90; }
        [Serializable] public sealed class PlateData { public string targetId = "plate_a"; public float x = 272f; public float width = 96f; }
        [Serializable] public sealed class DoorData { public string targetId = "gate_a"; public float x = 592f; public float width = 44f; public float top = 286f; public string plateTargetId = "plate_a"; }
        [Serializable] public sealed class GoalData { public string targetId = "exit_a"; public float x = 836f; public float width = 52f; public float height = 92f; }
    }

    /// <summary>
    /// Minimal L01 blockout for the period before serialized Unity scenes exist.
    /// It proves the source behavior: record the player, show one delayed shadow,
    /// let the shadow hold plate_a, open gate_a, and reach exit_a.
    /// Replace this with production CharacterMotor/ReplayActor after VS-00.
    /// </summary>
    public sealed class L01VerticalSliceBootstrap : MonoBehaviour
    {
        [SerializeField] private TextAsset definitionJson;
        [SerializeField] private DeterministicTickClock tickClock;
        [SerializeField] private L01LevelDefinition definition = new L01LevelDefinition();
        [SerializeField] private float sourceUnitScale = 0.01f;
        [SerializeField] private float moveUnitsPerTick = 0.078f; // 3.9 px/frame at 60 FPS -> 30 Hz

        private readonly List<Vector3> history = new List<Vector3>(256);
        private Transform player;
        private Transform shadow;
        private Transform plate;
        private Transform gate;
        private Transform exit;
        private bool gateOpen;
        private bool complete;

        private void Awake()
        {
            if (definitionJson != null)
            {
                JsonUtility.FromJsonOverwrite(definitionJson.text, definition);
            }
            sourceUnitScale = definition.sourceUnitScale;
            if (definition.shadow == null) definition.shadow = new L01LevelDefinition.ShadowData();
            if (definition.plates == null || definition.plates.Length == 0) definition.plates = new[] { new L01LevelDefinition.PlateData() };
            if (definition.doors == null || definition.doors.Length == 0) definition.doors = new[] { new L01LevelDefinition.DoorData() };
            if (definition.goal == null) definition.goal = new L01LevelDefinition.GoalData();
            if (definition.shadow.shadowDelayTicks <= 0) definition.shadow.shadowDelayTicks = 90;
            if (tickClock == null) tickClock = FindFirstObjectByType<DeterministicTickClock>();
            if (tickClock == null) tickClock = gameObject.AddComponent<DeterministicTickClock>();
            BuildBlockout();
            tickClock.BeforePhysicsTick += OnBeforePhysicsTick;
        }

        private void BuildBlockout()
        {
            var plateData = definition.plates[0];
            var doorData = definition.doors[0];
            player = MakeCube("Player", ToWorld(definition.player.startX, 0.5f), new Vector3(0.34f, 0.88f, 0.34f), Color.white);
            shadow = MakeCube("ShadowAgent", new Vector3(-10f, -10f, 0f), new Vector3(0.34f, 0.88f, 0.34f), new Color(0.35f, 0.08f, 0.12f));
            plate = MakeCube(plateData.targetId, ToWorld(plateData.x + plateData.width * 0.5f, 0.06f), new Vector3(plateData.width * sourceUnitScale, 0.12f, 0.8f), new Color(1f, 0.82f, 0.2f));
            gate = MakeCube(doorData.targetId, ToWorld(doorData.x + doorData.width * 0.5f, 1.8f), new Vector3(doorData.width * sourceUnitScale, 3.6f, 0.8f), new Color(0.28f, 0.36f, 0.7f));
            exit = MakeCube(definition.goal.targetId, ToWorld(definition.goal.x + definition.goal.width * 0.5f, 0.9f), new Vector3(definition.goal.width * sourceUnitScale, 1.8f, 0.8f), new Color(0.3f, 1f, 0.6f));
            MakeCube("Ground", new Vector3(4.8f, -0.05f, 0f), new Vector3(9.6f, 0.1f, 0.8f), new Color(0.14f, 0.17f, 0.32f));
        }

        private void OnBeforePhysicsTick(int tick)
        {
            if (complete || player == null) return;
            var move = ReadMove();
            player.position += Vector3.right * (move * moveUnitsPerTick);
            player.position = new Vector3(Mathf.Clamp(player.position.x, 0.1f, 9.4f), player.position.y, player.position.z);
            history.Add(player.position);

            var shadowIndex = history.Count - 1 - definition.shadow.shadowDelayTicks;
            if (shadowIndex >= 0)
            {
                shadow.gameObject.SetActive(true);
                shadow.position = history[shadowIndex];
            }

            var shadowOnPlate = shadow.gameObject.activeSelf && IsOnPlate(shadow.position.x);
            var playerOnPlate = IsOnPlate(player.position.x);
            gateOpen = playerOnPlate || shadowOnPlate;
            gate.localScale = new Vector3(gate.localScale.x, gateOpen ? 0.08f : 1f, gate.localScale.z);

            if (gateOpen && player.position.x >= ToWorld(definition.goal.x, 0f).x)
            {
                complete = true;
                Debug.Log("L01 complete: plate_a held by player/shadow, gate_a opened, exit_a reached.");
            }
        }

        private float ReadMove()
        {
            var keyboard = Keyboard.current;
            if (keyboard == null) return 0f;
            var left = keyboard.aKey.isPressed || keyboard.leftArrowKey.isPressed;
            var right = keyboard.dKey.isPressed || keyboard.rightArrowKey.isPressed;
            return right == left ? 0f : (right ? 1f : -1f);
        }

        private bool IsOnPlate(float x)
        {
            var plateData = definition.plates[0];
            var min = plateData.x * sourceUnitScale;
            var max = (plateData.x + plateData.width) * sourceUnitScale;
            return x >= min && x <= max;
        }

        private Vector3 ToWorld(float sourceX, float sourceY)
        {
            return new Vector3(sourceX * sourceUnitScale, sourceY, 0f);
        }

        private static Transform MakeCube(string objectName, Vector3 position, Vector3 scale, Color color)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = objectName;
            go.transform.position = position;
            go.transform.localScale = scale;
            var renderer = go.GetComponent<Renderer>();
            if (renderer != null)
            {
                var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
                renderer.material = new Material(shader) { color = color };
            }
            return go.transform;
        }

        private void OnDestroy()
        {
            if (tickClock != null) tickClock.BeforePhysicsTick -= OnBeforePhysicsTick;
        }
    }
}
