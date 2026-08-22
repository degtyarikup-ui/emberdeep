import { describe, it, expect } from 'vitest';
import Phaser from 'phaser';
import {
  Enemy,
  COMBAT_AGGRO_DURATION,
  SOCIAL_AGGRO_DURATION,
  PACK_ALERT_RADIUS,
  COMBAT_LOSE_RADIUS,
  NORMAL_ALERT_RADIUS,
} from '../src/entities/Enemy';

// Helper to create a minimal fake scene for unit testing Enemy state logic
function createMockScene(): Phaser.Scene {
  const tweens = {
    add: () => ({ remove: () => undefined }),
  };
  const time = {
    now: 1000,
    delayedCall: (_delay: number, callback: () => void) => {
      callback();
      return {};
    },
  };
  const add = {
    existing: (obj: any) => obj,
    sprite: () => ({
      setAlpha: () => ({ setDepth: () => ({ setPosition: () => undefined, destroy: () => undefined }) }),
      setPosition: () => undefined,
      destroy: () => undefined,
    }),
    text: () => ({
      setOrigin: () => ({ setDepth: () => ({ destroy: () => undefined }) }),
      destroy: () => undefined,
    }),
    rectangle: () => ({ destroy: () => undefined }),
  };
  const physics = {
    add: {
      existing: (obj: any) => {
        obj.body = {
          setSize: () => undefined,
          setOffset: () => undefined,
          setVelocity: (vx: number, vy: number) => {
            obj.body.velocity.x = vx;
            obj.body.velocity.y = vy;
          },
          velocity: {
            x: 0,
            y: 0,
            lengthSq: () => obj.body.velocity.x * obj.body.velocity.x + obj.body.velocity.y * obj.body.velocity.y,
          },
          enable: true,
        };
        return obj;
      },
    },
  };

  return {
    add,
    physics,
    tweens,
    time,
    anims: {
      on: () => undefined,
      once: () => undefined,
      off: () => undefined,
      emit: () => undefined,
      play: () => undefined,
      create: () => undefined,
      get: () => ({ frames: [{ frame: { customData: {} } }], getTotalFrames: () => 1, duration: 100, pause: () => undefined, resume: () => undefined }),
    },
    sys: {
      anims: {
        on: () => undefined,
        once: () => undefined,
        off: () => undefined,
        emit: () => undefined,
        get: () => ({ frames: [{ frame: { customData: {} } }], getTotalFrames: () => 1, duration: 100, pause: () => undefined, resume: () => undefined }),
      },
      textures: {
        get: () => ({ get: () => ({ customData: {} }), getFrameNames: () => [] }),
      },
      queueDepthSort: () => undefined,
      displayList: {
        queueDepthSort: () => undefined,
      },
      updateList: {
        add: () => undefined,
        remove: () => undefined,
      },
      events: {
      },
    },
  } as unknown as Phaser.Scene;
}

// Stubs for headless Phaser GameObject methods in unit tests
Enemy.prototype.play = function () { return this; } as any;
Enemy.prototype.setPipeline = function () { return this; } as any;

describe('Enemy aggro and social alerting logic', () => {
  it('defines valid combat constants', () => {
    expect(COMBAT_AGGRO_DURATION).toBe(6000);
    expect(SOCIAL_AGGRO_DURATION).toBe(5000);
    expect(PACK_ALERT_RADIUS).toBe(180);
    expect(NORMAL_ALERT_RADIUS).toBe(140);
    expect(COMBAT_LOSE_RADIUS).toBe(600);
    expect(COMBAT_LOSE_RADIUS).toBeGreaterThan(PACK_ALERT_RADIUS);
  });

  it('provokes enemy into chase when taking damage from long range', () => {
    const scene = createMockScene();
    const enemy = new Enemy(scene, 100, 100, 'skeleton', 1);

    expect(enemy.currentAIState).toBe('patrol');
    expect(enemy.currentAggroTimer).toBe(0);

    // Hit from 400px away (long range)
    const dead = enemy.takeDamage(1, 500, 100);

    expect(dead).toBe(false);
    expect(enemy.currentAIState).toBe('chase');
    expect(enemy.currentAggroTimer).toBe(COMBAT_AGGRO_DURATION);
    expect(enemy.isInCombat).toBe(true);

    // Update AI with player still far away (400px > base skeleton loseRadius of 195)
    // Because aggroTimer > 0, it should NOT lose target and should remain in chase!
    enemy.updateAI(500, 100, 16, [enemy]);
    expect(enemy.currentAIState).toBe('chase');
    expect(enemy.currentAggroTimer).toBe(COMBAT_AGGRO_DURATION - 16);
  });

  it('alerts nearby allies in pack when an ally is damaged (social aggro)', () => {
    const scene = createMockScene();
    const enemyA = new Enemy(scene, 100, 100, 'imp', 1);
    const enemyB = new Enemy(scene, 180, 100, 'imp', 2); // 80px away (within PACK_ALERT_RADIUS 180)
    const enemyFar = new Enemy(scene, 500, 500, 'imp', 3); // ~565px away (outside PACK_ALERT_RADIUS)

    expect(enemyA.currentAIState).toBe('patrol');
    expect(enemyB.currentAIState).toBe('patrol');
    expect(enemyFar.currentAIState).toBe('patrol');

    const pack = [enemyA, enemyB, enemyFar];

    // Player shoots enemyA
    enemyA.takeDamage(1, 0, 100, pack);

    // Enemy A is aggroed
    expect(enemyA.currentAIState).toBe('chase');
    expect(enemyA.currentAggroTimer).toBe(COMBAT_AGGRO_DURATION);

    // Enemy B (nearby ally) received social aggro
    expect(enemyB.currentAIState).toBe('alert');
    expect(enemyB.currentAggroTimer).toBe(SOCIAL_AGGRO_DURATION);
    expect(enemyB.isInCombat).toBe(true);

    // Enemy Far was not alerted
    expect(enemyFar.currentAIState).toBe('patrol');
    expect(enemyFar.currentAggroTimer).toBe(0);
  });

  it('loses target only when aggroTimer expires and target is beyond loseRadius', () => {
    const scene = createMockScene();
    const enemy = new Enemy(scene, 100, 100, 'wolf', 1);

    // Provoke enemy
    enemy.provoke(100, false);
    expect(enemy.currentAIState).toBe('alert');

    // Simulate alert transition
    enemy.updateAI(400, 100, 150, [enemy]);
    expect(enemy.currentAIState).toBe('chase');

    // Player is at 400px (beyond wolf loseRadius 260, but within COMBAT_LOSE_RADIUS 600)
    // While aggroTimer > 0, it stays in chase
    enemy.provoke(200, false);
    enemy.updateAI(400, 100, 50, [enemy]);
    expect(enemy.currentAIState).toBe('chase');

    // Now advance time so aggroTimer runs out (e.g. 500ms elapsed)
    enemy.updateAI(400, 100, 500, [enemy]);

    // Now that aggro expired and distance (300px) > wolf loseRadius (260px), enemy returns to patrol
    expect(enemy.currentAIState).toBe('patrol');
  });

  it('alerts nearby pack when enemy spots player normally during patrol', () => {
    const scene = createMockScene();
    const scout = new Enemy(scene, 100, 100, 'wolf', 1); // detectRadius = 180
    const ally = new Enemy(scene, 150, 100, 'skeleton', 2); // 50px away (within NORMAL_ALERT_RADIUS 140)

    const pack = [scout, ally];

    // Player enters scout's detectRadius (e.g. 150px away at x=250, y=100)
    scout.updateAI(250, 100, 16, pack);

    expect(scout.currentAIState).toBe('alert');
    expect(ally.currentAIState).toBe('alert');
    expect(ally.isInCombat).toBe(true);
  });
});
