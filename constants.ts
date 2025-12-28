import { Platform } from './types';

// Canvas Dimensions
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

// Physics
export const GRAVITY = 0.6;
export const FRICTION = 0.85;
export const MOVE_SPEED = 1.2; // Acceleration
export const MAX_SPEED = 8;
export const JUMP_FORCE = -14;
export const DOUBLE_JUMP_FORCE = -12;
export const FAST_FALL_SPEED = 1.5; // Added to gravity

// Game Mechanics
export const FPS = 60;
export const BOMB_FUSE_TIME = 10; // Seconds
export const BOMB_SPAWN_INTERVAL = 15; // Seconds
export const EXPLOSION_DAMAGE = 50;
export const EXPLOSION_RADIUS = 150;
export const KNOCKBACK_FORCE = 15;
export const TRANSFER_COOLDOWN = 1; // Seconds
export const RESPAWN_TIME = 3; // Seconds
export const MATCH_DURATION = 180; // Seconds (3 mins)
export const WIN_SCORE = 3;

// Map Design
export const PLATFORMS: Platform[] = [
  // Main Ground
  { x: 140, y: 600, w: 1000, h: 40, type: 'ground' },
  // Left Floater
  { x: 200, y: 400, w: 250, h: 20, type: 'platform' },
  // Right Floater
  { x: 830, y: 400, w: 250, h: 20, type: 'platform' },
  // Top Center
  { x: 515, y: 250, w: 250, h: 20, type: 'platform' },
];

export const BOUNDS = {
  left: 50,
  right: 1230,
  top: 0,
  bottom: 720
};

export const SPAWN_NODES = [
  { x: 640, y: 580 }, // Ground Center
  { x: 325, y: 380 }, // Left Plat
  { x: 955, y: 380 }, // Right Plat
  { x: 640, y: 230 }, // Top Plat
];