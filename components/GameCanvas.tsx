import React, { useRef, useEffect, useState } from 'react';
import { 
  GameState, 
  Player, 
  PlayerState, 
  BombState, 
  GameSettings,
  GameStatus
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
  BOMB_STICK_DELAY,
  RESPAWN_TIME,
  SPRITE_SIZE,
  SPRITE_SCALE,
  ANIM_SPEED
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
  onGameStart: () => void;
  gameStatus: GameStatus;
  settings: GameSettings;
  isPaused: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  onScoreUpdate, 
  onTimeUpdate, 
  onGameOver, 
  onGameStart,
  gameStatus,
  settings, 
  isPaused 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  // Images
  const p1Sprite = useRef<HTMLImageElement>(new Image());
  const p2Sprite = useRef<HTMLImageElement>(new Image());
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    let loadedCount = 0;
    const onload = () => {
        loadedCount++;
        if (loadedCount >= 2) setImagesLoaded(true);
    };
    
    // Changed back to .png as user likely has pngs for sprites
    p1Sprite.current.src = "/p1_spritesheet.png";
    p1Sprite.current.onload = onload;
    
    p2Sprite.current.src = "/p2_spritesheet.png";
    p2Sprite.current.onload = onload;

    // Fallback if they don't load
    setTimeout(() => setImagesLoaded(true), 1000);
  }, []);
  
  // Game State Ref
  const gameState = useRef<GameState>({
    players: [
      {
        id: 1,
        pos: { x: 200, y: 500 },
        vel: { x: 0, y: 0 },
        size: { x: 40, y: 60 },
        color: '#3B82F6', 
        hp: 100,
        maxHp: 100,
        facingRight: true,
        isGrounded: false,
        canDoubleJump: true,
        state: PlayerState.IDLE,
        respawnTimer: 0,
        score: 0,
        animFrame: 0,
        animTimer: 0,
        animRow: 0
      },
      {
        id: 2,
        pos: { x: 1000, y: 500 },
        vel: { x: 0, y: 0 },
        size: { x: 40, y: 60 },
        color: '#EF4444', 
        hp: 100,
        maxHp: 100,
        facingRight: false,
        isGrounded: false,
        canDoubleJump: true,
        state: PlayerState.IDLE,
        respawnTimer: 0,
        score: 0,
        animFrame: 0,
        animTimer: 0,
        animRow: 0
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
      stickCooldown: 0,
      spawnTimer: 1
    },
    particles: [],
    winner: null,
    isRunning: false,
    timeLeft: settings.matchDuration
  });

  // Sync settings when they change (if not playing)
  useEffect(() => {
    if (gameStatus === 'START') {
      gameState.current.timeLeft = settings.matchDuration;
      onTimeUpdate(settings.matchDuration);
    }
  }, [settings, gameStatus, onTimeUpdate]);

  // --- Input Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
      
      if (!gameState.current.isRunning || isPaused) return;

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
  }, [isPaused]);

  const throwBomb = (player: Player) => {
    const state = gameState.current;
    state.bomb.state = BombState.THROWN;
    state.bomb.ownerId = null;
    state.bomb.vel.x = player.facingRight ? 15 : -15;
    state.bomb.vel.y = -5;
    state.bomb.pos.x = player.pos.x + (player.size.x / 2);
    state.bomb.pos.y = player.pos.y;
    // Add delay so it doesn't instantly stick to the thrower
    state.bomb.stickCooldown = BOMB_STICK_DELAY; 
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
          { ...gameState.current.players[0], pos: { x: 200, y: 500 }, hp: 100, score: 0, state: PlayerState.IDLE, vel: {x:0, y:0}, respawnTimer: 0, animFrame: 0, animTimer: 0 },
          { ...gameState.current.players[1], pos: { x: 1000, y: 500 }, hp: 100, score: 0, state: PlayerState.IDLE, vel: {x:0, y:0}, respawnTimer: 0, animFrame: 0, animTimer: 0 }
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
          stickCooldown: 0,
          spawnTimer: 1
        },
        particles: [],
        winner: null,
        isRunning: true,
        timeLeft: settings.matchDuration
      };
      
      onScoreUpdate(0, 0);
      onTimeUpdate(settings.matchDuration);
      onGameStart();
  };

  const updateAnimation = (p: Player) => {
    let targetRow = 0;
    if (p.state === PlayerState.RUNNING) targetRow = 1;
    else if (p.state === PlayerState.JUMPING || p.state === PlayerState.FALLING) targetRow = 2;

    if (p.animRow !== targetRow) {
        p.animRow = targetRow;
        p.animFrame = 0;
    }

    p.animTimer += 1/FPS;
    if (p.animTimer >= ANIM_SPEED) {
        p.animTimer = 0;
        p.animFrame++;
        if (p.animFrame >= 6) p.animFrame = 0;
    }
  };

  // --- Main Loop ---
  const update = () => {
    const state = gameState.current;

    if (!state.isRunning || isPaused) return;

    // 1. Timer Logic
    state.timeLeft -= 1 / FPS;
    if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        if (state.players[0].score > state.players[1].score) state.winner = 1;
        else if (state.players[1].score > state.players[0].score) state.winner = 2;
        else state.winner = 0;
        state.isRunning = false;
        // setGameStatus('OVER'); // Handled by callback
        onGameOver(state.winner);
    }
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
              p.hp = 100;
              p.pos = { x: CANVAS_WIDTH / 2 - p.size.x / 2, y: 150 };
              p.vel = { x: 0, y: 0 };
              p.state = PlayerState.IDLE;
              spawnParticles(p.pos.x, p.pos.y, '#FFFFFF', 20);
          }
          return;
      }

      // Input Movement
      let isDropping = false;
      if (p.id === 1) {
        if (keysPressed.current['KeyA']) {
            p.vel.x -= MOVE_SPEED;
            p.facingRight = false;
        }
        if (keysPressed.current['KeyD']) {
            p.vel.x += MOVE_SPEED;
            p.facingRight = true;
        }
        if (keysPressed.current['KeyS']) {
            p.vel.y += FAST_FALL_SPEED;
            isDropping = true;
        }
      } else {
        if (keysPressed.current['ArrowLeft']) {
            p.vel.x -= MOVE_SPEED;
            p.facingRight = false;
        }
        if (keysPressed.current['ArrowRight']) {
            p.vel.x += MOVE_SPEED;
            p.facingRight = true;
        }
        if (keysPressed.current['ArrowDown']) {
             p.vel.y += FAST_FALL_SPEED;
             isDropping = true;
        }
      }

      // Apply Physics
      p.vel.x *= FRICTION;
      p.vel.y += GRAVITY;
      
      if (p.vel.x > MAX_SPEED) p.vel.x = MAX_SPEED;
      if (p.vel.x < -MAX_SPEED) p.vel.x = -MAX_SPEED;

      p.pos.x += p.vel.x;

      if (p.pos.x < BOUNDS.left) { p.pos.x = BOUNDS.left; p.vel.x = 0; }
      if (p.pos.x + p.size.x > BOUNDS.right) { p.pos.x = BOUNDS.right - p.size.x; p.vel.x = 0; }

      p.pos.y += p.vel.y;

      if (p.pos.y < BOUNDS.top) { p.pos.y = BOUNDS.top; p.vel.y = 0; }
      if (p.pos.y + p.size.y > BOUNDS.bottom) { p.pos.y = BOUNDS.bottom - p.size.y; p.vel.y = 0; p.isGrounded = true; } 

      // Platform Collision Y
      p.isGrounded = false;
      for (const plat of PLATFORMS) {
        // Drop through logic: If it's a floating platform and we are holding down, ignore collision
        if (plat.type === 'platform' && isDropping) continue;

        if (
            p.vel.y >= 0 && 
            p.pos.y + p.size.y - p.vel.y <= plat.y && 
            p.pos.y + p.size.y >= plat.y && 
            p.pos.x + p.size.x > plat.x && 
            p.pos.x < plat.x + plat.w
        ) {
            p.pos.y = plat.y - p.size.y;
            p.vel.y = 0;
            p.isGrounded = true;
            p.canDoubleJump = true;
        }
      }

      // Update State
      if (Math.abs(p.vel.x) > 0.5) p.state = PlayerState.RUNNING;
      else p.state = PlayerState.IDLE;
      if (!p.isGrounded) p.state = p.vel.y > 0 ? PlayerState.FALLING : PlayerState.JUMPING;

      // Update Animation
      updateAnimation(p);
    });

    // 3. Bomb Logic
    const bomb = state.bomb;
    if (bomb.stickCooldown > 0) bomb.stickCooldown -= 1/FPS;
    
    // Spawning
    if (bomb.state === BombState.SPAWNING) {
        bomb.spawnTimer -= 1/FPS;
        if (bomb.spawnTimer <= 0) {
            const node = SPAWN_NODES[Math.floor(Math.random() * SPAWN_NODES.length)];
            bomb.pos = { ...node };
            bomb.active = true;
            bomb.state = BombState.SPAWNING;
            bomb.spawnTimer = BOMB_SPAWN_INTERVAL;
        }
    }

    // Pickup
    if (bomb.active && bomb.state === BombState.SPAWNING) {
        state.players.forEach(p => {
            if (p.hp > 0 && checkRectCollision({ x: bomb.pos.x, y: bomb.pos.y, w: bomb.radius*2, h: bomb.radius*2 }, {x: p.pos.x, y: p.pos.y, w: p.size.x, h: p.size.y})) {
                bomb.state = BombState.HELD;
                bomb.ownerId = p.id;
                bomb.timer = BOMB_FUSE_TIME;
            }
        });
    }

    // Held
    if (bomb.state === BombState.HELD && bomb.ownerId) {
        const owner = state.players.find(p => p.id === bomb.ownerId);
        if (owner && owner.hp > 0) {
            bomb.pos.x = owner.pos.x + (owner.size.x / 2);
            bomb.pos.y = owner.pos.y - 10;
        } else {
            bomb.active = false;
            bomb.state = BombState.SPAWNING;
            bomb.ownerId = null;
        }
    }

    // Thrown
    if (bomb.state === BombState.THROWN) {
        bomb.vel.y += GRAVITY;
        bomb.pos.x += bomb.vel.x;
        bomb.pos.y += bomb.vel.y;

        // Bounce Bounds (X)
        if (bomb.pos.x < BOUNDS.left || bomb.pos.x > BOUNDS.right) bomb.vel.x *= -0.8;
        
        // --- NEW LOGIC: Despawn if hits ground ---
        let hitGround = false;
        if (bomb.pos.y > BOUNDS.bottom) {
          hitGround = true;
        } else {
            // Check collision with ground platforms
            for (const plat of PLATFORMS) {
                if (plat.type === 'ground' && 
                    checkRectCollision(
                        {x: bomb.pos.x, y: bomb.pos.y, w: bomb.radius*2, h: bomb.radius*2}, 
                        {x: plat.x, y: plat.y, w: plat.w, h: plat.h}
                    )) {
                    hitGround = true;
                    break;
                }
            }
        }

        if (hitGround) {
            // Poof effect
            spawnParticles(bomb.pos.x, bomb.pos.y, '#9CA3AF', 10);
            bomb.active = false;
            bomb.state = BombState.SPAWNING;
            bomb.ownerId = null;
            bomb.spawnTimer = BOMB_SPAWN_INTERVAL;
        }

        // Stick Collision - Only if cooldown is done
        if (bomb.stickCooldown <= 0 && !hitGround) {
            state.players.forEach(p => {
                if (p.hp > 0 && checkRectCollision({ x: bomb.pos.x - bomb.radius, y: bomb.pos.y - bomb.radius, w: bomb.radius*2, h: bomb.radius*2 }, {x: p.pos.x, y: p.pos.y, w: p.size.x, h: p.size.y})) {
                    bomb.state = BombState.STUCK;
                    bomb.ownerId = p.id;
                    bomb.transferCooldown = 0.5;
                }
            });
        }
    }

    // Stuck
    if (bomb.state === BombState.STUCK && bomb.ownerId) {
        const victim = state.players.find(p => p.id === bomb.ownerId);
        
        if (victim && victim.hp > 0) {
             bomb.pos.x = victim.pos.x + (victim.size.x / 2);
             bomb.pos.y = victim.pos.y + (victim.size.y / 2);
             bomb.timer -= 1/FPS;
             bomb.transferCooldown -= 1/FPS;

             if (bomb.transferCooldown <= 0) {
                 const other = state.players.find(p => p.id !== bomb.ownerId);
                 if (other && other.hp > 0) {
                     if (checkRectCollision(
                         {x: victim.pos.x, y: victim.pos.y, w: victim.size.x, h: victim.size.y},
                         {x: other.pos.x, y: other.pos.y, w: other.size.x, h: other.size.y}
                     )) {
                         bomb.ownerId = other.id;
                         bomb.transferCooldown = TRANSFER_COOLDOWN;
                         const dir = victim.pos.x < other.pos.x ? -1 : 1;
                         victim.vel.x = dir * 10;
                         other.vel.x = -dir * 10;
                     }
                 }
             }

             if (bomb.timer <= 0) {
                 bomb.state = BombState.EXPLODING;
                 victim.hp -= EXPLOSION_DAMAGE;
                 victim.vel.y = -10;
                 spawnParticles(bomb.pos.x, bomb.pos.y, '#FFA500', 50);
                 
                 if (victim.hp <= 0) {
                     const killer = state.players.find(p => p.id !== bomb.ownerId);
                     if (killer) {
                         killer.score += 1;
                         onScoreUpdate(state.players[0].score, state.players[1].score);
                         if (killer.score >= settings.winScore) {
                             state.winner = killer.id;
                             state.isRunning = false;
                             // setGameStatus('OVER'); // Handled by callback
                             onGameOver(killer.id);
                         }
                     }
                     victim.respawnTimer = RESPAWN_TIME;
                 }
                 bomb.active = false;
                 bomb.state = BombState.SPAWNING;
                 bomb.ownerId = null;
                 bomb.spawnTimer = BOMB_SPAWN_INTERVAL;
             }
        } else {
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
    
    // Background
    ctx.fillStyle = '#0f172a'; // Slate-900
    ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid (Subtle)
    ctx.strokeStyle = '#1e293b'; // Slate-800
    ctx.lineWidth = 1;
    for(let x=0; x<CANVAS_WIDTH; x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke(); }
    for(let y=0; y<CANVAS_HEIGHT; y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke(); }

    // Spawn Nodes
    if (gameState.current.bomb.state === BombState.SPAWNING && !gameState.current.bomb.active) {
         ctx.fillStyle = '#334155';
         SPAWN_NODES.forEach(node => {
             ctx.beginPath();
             ctx.arc(node.x, node.y, 5, 0, Math.PI * 2);
             ctx.fill();
         });
    }

    // Platforms
    PLATFORMS.forEach(plat => {
        ctx.fillStyle = '#00000060'; // Shadow
        ctx.fillRect(plat.x + 5, plat.y + 5, plat.w, plat.h);
        ctx.fillStyle = plat.type === 'ground' ? '#334155' : '#475569'; // Slate-700/600
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = '#64748b'; // Slate-500
        ctx.fillRect(plat.x, plat.y, plat.w, 4);
    });

    // Players
    gameState.current.players.forEach(p => {
        if (p.hp <= 0) return;

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

        // Draw Sprite
        const img = p.id === 1 ? p1Sprite.current : p2Sprite.current;
        if (imagesLoaded && img.complete && img.naturalWidth !== 0) {
            // Sprite Logic
            // p.size is the hit box (40x60). Sprite might be 32x32 scaled 2.5x -> 80x80.
            // We need to center the sprite on the hitbox.
            const spriteW = SPRITE_SIZE * SPRITE_SCALE;
            const spriteH = SPRITE_SIZE * SPRITE_SCALE;
            const drawX = p.pos.x + p.size.x/2 - spriteW/2;
            const drawY = p.pos.y + p.size.y - spriteH; // Anchor at feet

            // Flip if needed
            if (!p.facingRight) {
                ctx.translate(drawX + spriteW, drawY);
                ctx.scale(-1, 1);
                ctx.drawImage(
                    img,
                    p.animFrame * SPRITE_SIZE, p.animRow * SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE,
                    0, 0, spriteW, spriteH
                );
            } else {
                ctx.drawImage(
                    img,
                    p.animFrame * SPRITE_SIZE, p.animRow * SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE,
                    drawX, drawY, spriteW, spriteH
                );
            }
        } else {
            // Fallback Rect
            ctx.fillStyle = p.color;
            ctx.fillRect(p.pos.x, p.pos.y, p.size.x, p.size.y);
            // Eyes
            ctx.fillStyle = 'white';
            const eyeX = p.facingRight ? p.pos.x + 25 : p.pos.x + 5;
            ctx.fillRect(eyeX, p.pos.y + 10, 10, 10);
            ctx.fillStyle = 'black';
            ctx.fillRect(eyeX + (p.facingRight ? 4 : 2), p.pos.y + 12, 4, 4);
        }

        // Health Bar
        ctx.restore(); // Restore context first (handle flipping)
        const hpPct = p.hp / p.maxHp;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(p.pos.x - 5, p.pos.y - 25, p.size.x + 10, 8);
        ctx.fillStyle = hpPct > 0.5 ? '#10B981' : hpPct > 0.2 ? '#FBBF24' : '#EF4444';
        ctx.fillRect(p.pos.x - 4, p.pos.y - 24, (p.size.x + 8) * hpPct, 6);
    });

    // Bomb
    const bomb = gameState.current.bomb;
    if (bomb.active || bomb.state === BombState.HELD || bomb.state === BombState.THROWN || bomb.state === BombState.STUCK) {
        ctx.save();
        ctx.translate(bomb.pos.x, bomb.pos.y);
        
        let scale = 1;
        if (bomb.state === BombState.STUCK) {
            scale = 1 + Math.sin(Date.now() / 100) * 0.2;
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(bomb.timer.toFixed(1), 0, -30);
        }
        ctx.scale(scale, scale);

        // Make Bomb lighter and high contrast
        ctx.fillStyle = '#facc15'; // Yellow-400
        ctx.beginPath();
        ctx.arc(0, 0, bomb.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Bomb detail
        ctx.fillStyle = '#ca8a04'; 
        ctx.beginPath();
        ctx.arc(0,0, bomb.radius - 3, 0, Math.PI * 2);
        ctx.stroke();

        // Fuse
        ctx.beginPath();
        ctx.moveTo(0, -bomb.radius);
        ctx.quadraticCurveTo(5, -bomb.radius - 10, 10, -bomb.radius - 5);
        ctx.strokeStyle = '#fb923c'; // Orange
        ctx.lineWidth = 2;
        ctx.stroke();

        // Spark
        if (bomb.state === BombState.STUCK || bomb.state === BombState.HELD) {
            ctx.fillStyle = '#ef4444';
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
  }, [isPaused, settings]);

  return (
    <div className="relative w-full h-full flex justify-center items-center bg-gray-900">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-4 border-slate-700 rounded-lg shadow-2xl bg-slate-800"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
      
      {/* Start / Game Over Overlay */}
      {gameStatus !== 'PLAYING' && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white z-20 backdrop-blur-sm">
            {gameStatus === 'START' ? (
                <div className="text-center">
                    <h1 className="text-6xl font-arcade mb-8 text-yellow-400 drop-shadow-lg">Sticky Bomb Chaos</h1>
                    <div className="grid grid-cols-2 gap-8 mb-8 text-left bg-slate-800 p-6 rounded-lg border border-slate-600">
                        <div>
                            <h3 className="text-blue-400 font-bold mb-2 text-xl">PLAYER 1 (Blue)</h3>
                            <ul className="space-y-1 text-gray-300">
                                <li><span className="font-bold text-white">WASD</span> to Move/Jump</li>
                                <li><span className="font-bold text-white">S</span> to Fast Fall / Drop</li>
                                <li><span className="font-bold text-white">G</span> to Throw Bomb</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-red-400 font-bold mb-2 text-xl">PLAYER 2 (Red)</h3>
                            <ul className="space-y-1 text-gray-300">
                                <li><span className="font-bold text-white">Arrows</span> to Move/Jump</li>
                                <li><span className="font-bold text-white">Down</span> to Fast Fall / Drop</li>
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
                    <p className="mt-4 text-xs text-gray-500">Ensure p1_spritesheet.png and p2_spritesheet.png are in your public folder.</p>
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