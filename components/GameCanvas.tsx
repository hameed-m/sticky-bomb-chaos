import React, { useRef, useEffect, useState } from 'react';
import { 
  GameState, 
  Player, 
  PlayerState, 
  BombState, 
  Vector2, 
  Particle 
} from '../types';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  GRAVITY, 
  FRICTION, 
  MOVE_SPEED, 
  MAX_SPEED, 
  JUMP_FORCE, 
  DOUBLE_JUMP_FORCE, 
  FAST_FALL_SPEED,
  PLATFORMS, 
  BOUNDS, 
  SPAWN_NODES,
  FPS,
  BOMB_FUSE_TIME,
  BOMB_SPAWN_INTERVAL,
  EXPLOSION_DAMAGE,
  TRANSFER_COOLDOWN,
  RESPAWN_TIME,
  KNOCKBACK_FORCE,
  WIN_SCORE
} from '../constants';
import { Play, RotateCcw } from 'lucide-react';

// Helper for AABB Collision
const checkRectCollision = (r1: {x: number, y: number, w: number, h: number}, r2: {x: number, y: number, w: number, h: number}) => {
  return (
    r1.x < r2.x + r2.w &&
    r1.x + r1.w > r2.x &&
    r1.y < r2.y + r2.h &&
    r1.y + r1.h > r2.y
  );
};

interface GameCanvasProps {
  onScoreUpdate: (p1Score: number, p2Score: number) => void;
  onTimeUpdate: (time: number) => void;
  onGameOver: (winnerId: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onScoreUpdate, onTimeUpdate, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  // Game State Ref (Mutable for performance)
  const gameState = useRef<GameState>({
    players: [
      {
        id: 1,
        pos: { x: 200, y: 500 },
        vel: { x: 0, y: 0 },
        size: { x: 40, y: 60 },
        color: '#3B82F6', // Blue-500
        hp: 100,
        maxHp: 100,
        facingRight: true,
        isGrounded: false,
        canDoubleJump: true,
        state: PlayerState.IDLE,
        respawnTimer: 0,
        score: 0
      },
      {
        id: 2,
        pos: { x: 1000, y: 500 },
        vel: { x: 0, y: 0 },
        size: { x: 40, y: 60 },
        color: '#EF4444', // Red-500
        hp: 100,
        maxHp: 100,
        facingRight: false,
        isGrounded: false,
        canDoubleJump: true,
        state: PlayerState.IDLE,
        respawnTimer: 0,
        score: 0
      }
    ],
    bomb: {
      active: false,
      pos: { x: -100, y: -100 },
      vel: { x: 0, y: 0 },
      radius: 12,
      state: BombState.SPAWNING,
      ownerId: null,
      timer: 0,
      transferCooldown: 0,
      spawnTimer: 1 // Start spawning immediately
    },
    particles: [],
    winner: null,
    isRunning: false,
    timeLeft: 180
  });

  const [gameStatus, setGameStatus] = useState<'START' | 'PLAYING' | 'OVER'>('START');

  // --- Input Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
      
      // Jump Logic (Event driven for precision)
      if (!gameState.current.isRunning) return;

      // P1 Jump
      if (e.code === 'KeyW') {
        const p1 = gameState.current.players[0];
        if (p1.hp > 0) {
            if (p1.isGrounded) {
            p1.vel.y = JUMP_FORCE;
            p1.isGrounded = false;
            } else if (p1.canDoubleJump) {
            p1.vel.y = DOUBLE_JUMP_FORCE;
            p1.canDoubleJump = false;
            }
        }
      }
      // P2 Jump
      if (e.code === 'ArrowUp') {
        const p2 = gameState.current.players[1];
        if (p2.hp > 0) {
            if (p2.isGrounded) {
            p2.vel.y = JUMP_FORCE;
            p2.isGrounded = false;
            } else if (p2.canDoubleJump) {
            p2.vel.y = DOUBLE_JUMP_FORCE;
            p2.canDoubleJump = false;
            }
        }
      }

      // Throw Actions
      const bomb = gameState.current.bomb;
      // P1 Throw
      if (e.code === 'KeyG' && bomb.state === BombState.HELD && bomb.ownerId === 1) {
        throwBomb(gameState.current.players[0]);
      }
      // P2 Throw
      if (e.code === 'KeyL' && bomb.state === BombState.HELD && bomb.ownerId === 2) {
        throwBomb(gameState.current.players[1]);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const throwBomb = (player: Player) => {
    const state = gameState.current;
    state.bomb.state = BombState.THROWN;
    state.bomb.ownerId = null; // No one holds it in air
    // Throw velocity
    state.bomb.vel.x = player.facingRight ? 15 : -15;
    state.bomb.vel.y = -5;
    state.bomb.pos.x = player.pos.x + (player.size.x / 2);
    state.bomb.pos.y = player.pos.y;
  };

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
        gameState.current.particles.push({
            id: Math.random(),
            pos: { x, y },
            vel: { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 },
            life: 1.0,
            color: color,
            size: Math.random() * 5 + 2
        });
    }
  };

  const resetGame = () => {
    gameState.current = {
        players: [
          { ...gameState.current.players[0], pos: { x: 200, y: 500 }, hp: 100, score: 0, state: PlayerState.IDLE, vel: {x:0, y:0}, respawnTimer: 0 },
          { ...gameState.current.players[1], pos: { x: 1000, y: 500 }, hp: 100, score: 0, state: PlayerState.IDLE, vel: {x:0, y:0}, respawnTimer: 0 }
        ],
        bomb: {
          active: false,
          pos: { x: -100, y: -100 },
          vel: { x: 0, y: 0 },
          radius: 12,
          state: BombState.SPAWNING,
          ownerId: null,
          timer: 0,
          transferCooldown: 0,
          spawnTimer: 1
        },
        particles: [],
        winner: null,
        isRunning: true,
        timeLeft: 180
      };
      setGameStatus('PLAYING');
      onScoreUpdate(0, 0);
      onTimeUpdate(180);
  };

  // --- Main Loop ---
  const update = () => {
    const state = gameState.current;

    if (!state.isRunning) return;

    // 1. Timer Logic
    state.timeLeft -= 1 / FPS;
    if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        // Time Over Win Condition
        if (state.players[0].score > state.players[1].score) state.winner = 1;
        else if (state.players[1].score > state.players[0].score) state.winner = 2;
        else state.winner = 0; // Draw (handled as 0)
        state.isRunning = false;
        setGameStatus('OVER');
        onGameOver(state.winner);
    }
    // Only update React UI every second (approx) to save renders
    if (Math.floor(state.timeLeft) % 1 === 0) {
        onTimeUpdate(Math.ceil(state.timeLeft));
    }


    // 2. Player Logic
    state.players.forEach(p => {
      // Respawn Logic
      if (p.hp <= 0) {
          p.state = PlayerState.DEAD;
          p.respawnTimer -= 1/FPS;
          if (p.respawnTimer <= 0) {
              // Respawn
              p.hp = 100;
              p.pos = { x: CANVAS_WIDTH / 2 - p.size.x / 2, y: 150 }; // Drop from sky center
              p.vel = { x: 0, y: 0 };
              p.state = PlayerState.IDLE;
              spawnParticles(p.pos.x, p.pos.y, '#FFFFFF', 20);
          }
          return; // Skip physics if dead
      }

      // Input Movement
      if (p.id === 1) {
        if (keysPressed.current['KeyA']) {
            p.vel.x -= MOVE_SPEED;
            p.facingRight = false;
        }
        if (keysPressed.current['KeyD']) {
            p.vel.x += MOVE_SPEED;
            p.facingRight = true;
        }
        if (keysPressed.current['KeyS']) p.vel.y += FAST_FALL_SPEED;
      } else {
        if (keysPressed.current['ArrowLeft']) {
            p.vel.x -= MOVE_SPEED;
            p.facingRight = false;
        }
        if (keysPressed.current['ArrowRight']) {
            p.vel.x += MOVE_SPEED;
            p.facingRight = true;
        }
        if (keysPressed.current['ArrowDown']) p.vel.y += FAST_FALL_SPEED;
      }

      // Apply Physics
      p.vel.x *= FRICTION;
      p.vel.y += GRAVITY;
      
      // Clamp Velocity
      if (p.vel.x > MAX_SPEED) p.vel.x = MAX_SPEED;
      if (p.vel.x < -MAX_SPEED) p.vel.x = -MAX_SPEED;

      // Move X
      p.pos.x += p.vel.x;

      // Bounds Collision X
      if (p.pos.x < BOUNDS.left) { p.pos.x = BOUNDS.left; p.vel.x = 0; }
      if (p.pos.x + p.size.x > BOUNDS.right) { p.pos.x = BOUNDS.right - p.size.x; p.vel.x = 0; }

      // Platform Collision X (Basic check to prevent sticking to walls)
      // Omitted for simplicity in this 2D jam context, relying on Y collision mostly.

      // Move Y
      p.pos.y += p.vel.y;

      // Bounds Collision Y
      if (p.pos.y < BOUNDS.top) { p.pos.y = BOUNDS.top; p.vel.y = 0; }
      if (p.pos.y + p.size.y > BOUNDS.bottom) { p.pos.y = BOUNDS.bottom - p.size.y; p.vel.y = 0; p.isGrounded = true; } 

      // Platform Collision Y
      p.isGrounded = false; // Assume air first
      for (const plat of PLATFORMS) {
        // Only collide if falling downwards and above the platform
        if (
            p.vel.y >= 0 && // Falling
            p.pos.y + p.size.y - p.vel.y <= plat.y && // Was above last frame (roughly)
            p.pos.y + p.size.y >= plat.y && // Is intersecting now
            p.pos.x + p.size.x > plat.x && // Within X bounds
            p.pos.x < plat.x + plat.w
        ) {
            p.pos.y = plat.y - p.size.y;
            p.vel.y = 0;
            p.isGrounded = true;
            p.canDoubleJump = true;
        }
      }

      // Update State String
      if (Math.abs(p.vel.x) > 0.5) p.state = PlayerState.RUNNING;
      else p.state = PlayerState.IDLE;
      if (!p.isGrounded) p.state = PlayerState.JUMPING;
    });

    // 3. Bomb Logic
    const bomb = state.bomb;
    
    // Spawning
    if (bomb.state === BombState.SPAWNING) {
        bomb.spawnTimer -= 1/FPS;
        if (bomb.spawnTimer <= 0) {
            const node = SPAWN_NODES[Math.floor(Math.random() * SPAWN_NODES.length)];
            bomb.pos = { ...node };
            bomb.active = true;
            bomb.state = BombState.SPAWNING; // Still waiting for pickup, but visible
            bomb.spawnTimer = BOMB_SPAWN_INTERVAL; // Reset for NEXT cycle after this one is gone
        }
    }

    // Pickup (If visible and not held/stuck)
    if (bomb.active && bomb.state === BombState.SPAWNING) {
        state.players.forEach(p => {
            if (p.hp > 0 && checkRectCollision({ x: bomb.pos.x, y: bomb.pos.y, w: bomb.radius*2, h: bomb.radius*2 }, {x: p.pos.x, y: p.pos.y, w: p.size.x, h: p.size.y})) {
                bomb.state = BombState.HELD;
                bomb.ownerId = p.id;
                // Init Timer on first pickup
                bomb.timer = BOMB_FUSE_TIME;
            }
        });
    }

    // Held Logic
    if (bomb.state === BombState.HELD && bomb.ownerId) {
        const owner = state.players.find(p => p.id === bomb.ownerId);
        if (owner && owner.hp > 0) {
            bomb.pos.x = owner.pos.x + (owner.size.x / 2);
            bomb.pos.y = owner.pos.y - 10;
        } else {
            // Owner died while holding? Drop it? Or explode? Let's reset.
            bomb.active = false;
            bomb.state = BombState.SPAWNING;
            bomb.ownerId = null;
        }
    }

    // Thrown Logic
    if (bomb.state === BombState.THROWN) {
        bomb.vel.y += GRAVITY;
        bomb.pos.x += bomb.vel.x;
        bomb.pos.y += bomb.vel.y;

        // Bounce Bounds
        if (bomb.pos.x < BOUNDS.left || bomb.pos.x > BOUNDS.right) bomb.vel.x *= -0.8;
        if (bomb.pos.y > BOUNDS.bottom) {
             bomb.pos.y = BOUNDS.bottom;
             bomb.vel.y *= -0.6;
             bomb.vel.x *= 0.9; // Ground friction
        }

        // Stick Collision
        state.players.forEach(p => {
            if (p.hp > 0 && checkRectCollision({ x: bomb.pos.x - bomb.radius, y: bomb.pos.y - bomb.radius, w: bomb.radius*2, h: bomb.radius*2 }, {x: p.pos.x, y: p.pos.y, w: p.size.x, h: p.size.y})) {
                bomb.state = BombState.STUCK;
                bomb.ownerId = p.id;
                bomb.transferCooldown = 0.5; // Brief cooldown so you don't instantly stick it back to yourself if threw close
            }
        });
    }

    // Stuck Logic (The Hot Potato)
    if (bomb.state === BombState.STUCK && bomb.ownerId) {
        const victim = state.players.find(p => p.id === bomb.ownerId);
        
        if (victim && victim.hp > 0) {
             // Follow Victim
             bomb.pos.x = victim.pos.x + (victim.size.x / 2);
             bomb.pos.y = victim.pos.y + (victim.size.y / 2);

             // Countdown
             bomb.timer -= 1/FPS;
             bomb.transferCooldown -= 1/FPS;

             // Transfer Logic
             if (bomb.transferCooldown <= 0) {
                 const other = state.players.find(p => p.id !== bomb.ownerId);
                 if (other && other.hp > 0) {
                     if (checkRectCollision(
                         {x: victim.pos.x, y: victim.pos.y, w: victim.size.x, h: victim.size.y},
                         {x: other.pos.x, y: other.pos.y, w: other.size.x, h: other.size.y}
                     )) {
                         // SWAP!
                         bomb.ownerId = other.id;
                         bomb.transferCooldown = TRANSFER_COOLDOWN;
                         // Juice: Push them apart slightly
                         const dir = victim.pos.x < other.pos.x ? -1 : 1;
                         victim.vel.x = dir * 10;
                         other.vel.x = -dir * 10;
                     }
                 }
             }

             // EXPLOSION
             if (bomb.timer <= 0) {
                 bomb.state = BombState.EXPLODING;
                 // Damage
                 victim.hp -= EXPLOSION_DAMAGE;
                 // Knockback
                 victim.vel.y = -10;
                 // FX
                 spawnParticles(bomb.pos.x, bomb.pos.y, '#FFA500', 50);
                 
                 // Check Death
                 if (victim.hp <= 0) {
                     const killer = state.players.find(p => p.id !== bomb.ownerId);
                     if (killer) {
                         killer.score += 1;
                         onScoreUpdate(state.players[0].score, state.players[1].score);
                         // Win Check
                         if (killer.score >= WIN_SCORE) {
                             state.winner = killer.id;
                             state.isRunning = false;
                             setGameStatus('OVER');
                             onGameOver(killer.id);
                         }
                     }
                     victim.respawnTimer = RESPAWN_TIME;
                 }

                 // Reset Bomb
                 bomb.active = false;
                 bomb.state = BombState.SPAWNING;
                 bomb.ownerId = null;
                 bomb.spawnTimer = BOMB_SPAWN_INTERVAL;
             }
        } else {
             // Victim died before explosion? Reset.
             bomb.active = false;
             bomb.state = BombState.SPAWNING;
             bomb.ownerId = null;
        }
    }

    // 4. Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.life -= 0.02;
        p.pos.x += p.vel.x;
        p.pos.y += p.vel.y;
        if (p.life <= 0) state.particles.splice(i, 1);
    }

  };

  // --- Rendering ---
  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Background (Subtle Grid)
    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 1;
    for(let x=0; x<CANVAS_WIDTH; x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke(); }
    for(let y=0; y<CANVAS_HEIGHT; y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke(); }

    // Spawn Nodes
    if (gameState.current.bomb.state === BombState.SPAWNING && !gameState.current.bomb.active) {
         // Show where nodes are vaguely
         ctx.fillStyle = '#374151';
         SPAWN_NODES.forEach(node => {
             ctx.beginPath();
             ctx.arc(node.x, node.y, 5, 0, Math.PI * 2);
             ctx.fill();
         });
    }

    // Platforms
    PLATFORMS.forEach(plat => {
        // Shadow
        ctx.fillStyle = '#00000040';
        ctx.fillRect(plat.x + 5, plat.y + 5, plat.w, plat.h);
        // Body
        ctx.fillStyle = plat.type === 'ground' ? '#4B5563' : '#6B7280';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        // Highlight
        ctx.fillStyle = '#9CA3AF';
        ctx.fillRect(plat.x, plat.y, plat.w, 4);
    });

    // Players
    gameState.current.players.forEach(p => {
        if (p.hp <= 0) return; // Don't draw if dead

        ctx.save();
        
        // Stuck Effect (Panic Sweat)
        if (gameState.current.bomb.state === BombState.STUCK && gameState.current.bomb.ownerId === p.id) {
             ctx.fillStyle = '#00CCFF';
             ctx.globalAlpha = 0.6;
             ctx.beginPath();
             ctx.arc(p.pos.x + p.size.x/2, p.pos.y - 10, 5, 0, Math.PI*2);
             ctx.fill();
             ctx.beginPath();
             ctx.arc(p.pos.x + p.size.x/2 + 10, p.pos.y - 5, 3, 0, Math.PI*2);
             ctx.fill();
             ctx.globalAlpha = 1.0;
        }

        // Body
        ctx.fillStyle = p.color;
        // Simple Squash/Stretch based on Y velocity
        const stretch = Math.abs(p.vel.y) * 0.5;
        ctx.fillRect(p.pos.x + (p.facingRight ? 0 : 0), p.pos.y - stretch, p.size.x, p.size.y + stretch);
        
        // Eyes (Direction)
        ctx.fillStyle = 'white';
        const eyeX = p.facingRight ? p.pos.x + 25 : p.pos.x + 5;
        ctx.fillRect(eyeX, p.pos.y + 10, 10, 10);
        ctx.fillStyle = 'black';
        ctx.fillRect(eyeX + (p.facingRight ? 4 : 2), p.pos.y + 12, 4, 4);

        // Health Bar above player
        const hpPct = p.hp / p.maxHp;
        ctx.fillStyle = '#1F2937';
        ctx.fillRect(p.pos.x - 5, p.pos.y - 25, p.size.x + 10, 8);
        ctx.fillStyle = hpPct > 0.5 ? '#10B981' : hpPct > 0.2 ? '#FBBF24' : '#EF4444';
        ctx.fillRect(p.pos.x - 4, p.pos.y - 24, (p.size.x + 8) * hpPct, 6);

        ctx.restore();
    });

    // Bomb
    const bomb = gameState.current.bomb;
    if (bomb.active || bomb.state === BombState.HELD || bomb.state === BombState.THROWN || bomb.state === BombState.STUCK) {
        ctx.save();
        ctx.translate(bomb.pos.x, bomb.pos.y);
        
        // Pulse if Stuck
        let scale = 1;
        if (bomb.state === BombState.STUCK) {
            scale = 1 + Math.sin(Date.now() / 100) * 0.2;
            
            // Draw Timer text
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(bomb.timer.toFixed(1), 0, -30);
        }

        ctx.scale(scale, scale);

        // Bomb Body
        ctx.fillStyle = '#1F2937'; // Black/Grey
        ctx.beginPath();
        ctx.arc(0, 0, bomb.radius, 0, Math.PI * 2);
        ctx.fill();

        // Fuse
        ctx.beginPath();
        ctx.moveTo(0, -bomb.radius);
        ctx.quadraticCurveTo(5, -bomb.radius - 10, 10, -bomb.radius - 5);
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Spark
        if (bomb.state === BombState.STUCK || bomb.state === BombState.HELD) {
            ctx.fillStyle = '#EF4444';
            ctx.beginPath();
            ctx.arc(10, -bomb.radius - 5, 3 + Math.random()*2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // Particles
    gameState.current.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

  };

  const loop = () => {
    update();
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) draw(ctx);
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="relative w-full h-full flex justify-center items-center bg-gray-900">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-4 border-gray-700 rounded-lg shadow-2xl bg-gray-800"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
      
      {/* Start / Game Over Overlay */}
      {gameStatus !== 'PLAYING' && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white z-20 backdrop-blur-sm">
            {gameStatus === 'START' ? (
                <div className="text-center">
                    <h1 className="text-6xl font-arcade mb-8 text-yellow-400 drop-shadow-lg">Sticky Bomb Chaos</h1>
                    <div className="grid grid-cols-2 gap-8 mb-8 text-left bg-gray-800 p-6 rounded-lg border border-gray-600">
                        <div>
                            <h3 className="text-blue-400 font-bold mb-2 text-xl">PLAYER 1 (Blue)</h3>
                            <ul className="space-y-1 text-gray-300">
                                <li><span className="font-bold text-white">WASD</span> to Move/Jump</li>
                                <li><span className="font-bold text-white">S</span> to Fast Fall</li>
                                <li><span className="font-bold text-white">G</span> to Throw Bomb</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-red-400 font-bold mb-2 text-xl">PLAYER 2 (Red)</h3>
                            <ul className="space-y-1 text-gray-300">
                                <li><span className="font-bold text-white">Arrows</span> to Move/Jump</li>
                                <li><span className="font-bold text-white">Down</span> to Fast Fall</li>
                                <li><span className="font-bold text-white">L</span> to Throw Bomb</li>
                            </ul>
                        </div>
                    </div>
                    <button 
                        onClick={resetGame}
                        className="group relative px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-bold text-xl rounded shadow-[0_4px_0_rgb(21,128,61)] active:shadow-[0_0px_0_rgb(21,128,61)] active:translate-y-1 transition-all flex items-center gap-2 mx-auto"
                    >
                        <Play size={24} /> START MATCH
                    </button>
                </div>
            ) : (
                <div className="text-center">
                    <h2 className="text-5xl font-arcade mb-4 text-white">GAME OVER</h2>
                    <div className="text-3xl mb-8 font-bold" style={{ color: gameState.current.winner === 1 ? '#3B82F6' : gameState.current.winner === 2 ? '#EF4444' : '#FFF' }}>
                        {gameState.current.winner === 0 ? "DRAW!" : `PLAYER ${gameState.current.winner} WINS!`}
                    </div>
                    <button 
                        onClick={resetGame}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xl rounded shadow-[0_4px_0_rgb(37,99,235)] active:translate-y-1 transition-all flex items-center gap-2 mx-auto"
                    >
                        <RotateCcw size={24} /> REMATCH
                    </button>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default GameCanvas;