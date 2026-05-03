"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Board, Cell, ClearGroup, Pair, PuyoType, SpecialRemoval,
  BOARD_COLS, BOARD_ROWS,
  applyGravity, calcScore, canPlace, clearAll,
  emptyBoard, findClearGroups, findSpecialRemovals, lockPair, moveDown,
  moveLeft, moveRight, randomPair, rotateCCW, rotateCW,
} from "@/lib/puyo-game";
import PuyoCell from "./PuyoCell";

type Phase = "falling" | "locking" | "clearing" | "gravity" | "gameover";

interface ClearState {
  groups: ClearGroup[];
  special: SpecialRemoval;
}

const CELL_SIZE = 48;
const FALL_INTERVAL = 500;
const LOCK_DELAY = 300;
const CLEAR_DURATION = 700;
const GRAVITY_DELAY = 300;

function getNeighbors(board: (Cell | "ghost")[][], row: number, col: number, type: PuyoType) {
  // Special puyos are always round — no blob shape with neighbors
  if (type === "ojama" || type === "bomb") {
    return { top: false, bottom: false, left: false, right: false };
  }
  return {
    top: row > 0 && board[row - 1][col] === type,
    bottom: row < BOARD_ROWS - 1 && board[row + 1][col] === type,
    left: col > 0 && board[row][col - 1] === type,
    right: col < BOARD_COLS - 1 && board[row][col + 1] === type,
  };
}

export default function PuyoGame() {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [pair, setPair] = useState<Pair | null>(null);
  const [nextPair, setNextPair] = useState<Pair>(() => randomPair());
  const [phase, setPhase] = useState<Phase>("falling");
  const [clearState, setClearState] = useState<ClearState | null>(null);
  const [score, setScore] = useState(0);
  const [chain, setChain] = useState(0);
  const [started, setStarted] = useState(false);
  const chainRef = useRef(0);
  const boardRef = useRef<Board>(emptyBoard());
  const pairRef = useRef<Pair | null>(null);
  const phaseRef = useRef<Phase>("falling");
  const nextPairRef = useRef<Pair>(randomPair());

  const syncBoard = (b: Board) => { boardRef.current = b; setBoard(b); };
  const syncPair = (p: Pair | null) => { pairRef.current = p; setPair(p); };
  const syncPhase = (ph: Phase) => { phaseRef.current = ph; setPhase(ph); };

  const spawnPair = useCallback((b: Board, next: Pair) => {
    const p = randomPair();
    if (!canPlace(b, next)) {
      syncPhase("gameover");
      return;
    }
    syncPair(next);
    nextPairRef.current = p;
    setNextPair(p);
    syncPhase("falling");
  }, []);

  const startClearPhase = useCallback((b: Board, ch: number) => {
    const groups = findClearGroups(b);
    if (groups.length === 0) {
      chainRef.current = 0;
      setChain(0);
      syncBoard(b);
      spawnPair(b, nextPairRef.current);
      return;
    }

    const special = findSpecialRemovals(b, groups);
    setClearState({ groups, special });
    syncPhase("clearing");
    const pts = calcScore(groups, ch);
    setScore((s) => s + pts);
    setChain(ch);

    setTimeout(() => {
      const cleared = clearAll(b, groups, special);
      setClearState(null);
      const gravity = applyGravity(cleared);
      syncBoard(gravity);
      syncPhase("gravity");

      setTimeout(() => {
        startClearPhase(gravity, ch + 1);
      }, GRAVITY_DELAY);
    }, CLEAR_DURATION);
  }, [spawnPair]);

  const lockCurrentPair = useCallback(() => {
    const b = boardRef.current;
    const p = pairRef.current;
    if (!p) return;
    const locked = lockPair(b, p);
    const gravity = applyGravity(locked);
    syncBoard(gravity);
    syncPair(null);
    chainRef.current = 0;
    startClearPhase(gravity, 1);
  }, [startClearPhase]);

  // Auto-fall
  useEffect(() => {
    if (!started || phaseRef.current !== "falling") return;
    const id = setInterval(() => {
      if (phaseRef.current !== "falling") return;
      const p = pairRef.current;
      if (!p) return;
      const moved = moveDown(boardRef.current, p);
      if (moved === p) {
        syncPhase("locking");
        setTimeout(lockCurrentPair, LOCK_DELAY);
      } else {
        syncPair(moved);
      }
    }, FALL_INTERVAL);
    return () => clearInterval(id);
  }, [started, phase, lockCurrentPair]);

  // Keyboard
  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== "falling") return;
      const p = pairRef.current;
      const b = boardRef.current;
      if (!p) return;
      switch (e.key) {
        case "ArrowLeft": syncPair(moveLeft(b, p)); break;
        case "ArrowRight": syncPair(moveRight(b, p)); break;
        case "ArrowDown": {
          const moved = moveDown(b, p);
          if (moved === p) {
            syncPhase("locking");
            setTimeout(lockCurrentPair, LOCK_DELAY);
          } else syncPair(moved);
          break;
        }
        case "ArrowUp":
        case "z": syncPair(rotateCCW(b, p)); break;
        case "x": syncPair(rotateCW(b, p)); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, lockCurrentPair]);

  const startGame = () => {
    const b = emptyBoard();
    const p = randomPair();
    const n = randomPair();
    syncBoard(b);
    syncPair(p);
    nextPairRef.current = n;
    setNextPair(n);
    syncPhase("falling");
    setScore(0);
    setChain(0);
    chainRef.current = 0;
    setStarted(true);
  };

  // Build display board (board + falling pair)
  const displayBoard: (Cell | "ghost")[][] = board.map((r) => [...r]);
  if (pair) {
    for (const c of [pair.pivot, pair.satellite]) {
      if (c.row >= 0 && c.row < BOARD_ROWS) displayBoard[c.row][c.col] = c.color;
    }
  }

  // Build animation sets
  const clearingSet = new Set<string>();
  const blastSet = new Set<string>();
  if (clearState) {
    for (const g of clearState.groups) {
      for (const { row, col } of g.cells) clearingSet.add(`${row},${col}`);
    }
    for (const { row, col } of clearState.special.ojamaCells) clearingSet.add(`${row},${col}`);
    for (const { row, col } of clearState.special.bombCells) clearingSet.add(`${row},${col}`);
    for (const { row, col } of clearState.special.blastCells) blastSet.add(`${row},${col}`);
  }

  const isLandingSet = new Set<string>();
  if (phase === "locking" && pair) {
    for (const c of [pair.pivot, pair.satellite]) isLandingSet.add(`${c.row},${c.col}`);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#080818] p-4 font-mono select-none">
      {/* Title */}
      <h1 className="text-4xl font-extrabold mb-6 tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-cyan-400 drop-shadow-[0_0_20px_rgba(103,232,249,0.8)] animate-pulse-slow">
        CYBER PUYO
      </h1>

      <div className="flex gap-8 items-start">
        {/* Main board */}
        <div
          className="relative border-2 border-cyan-500/60 shadow-[0_0_40px_rgba(6,182,212,0.3)] rounded-sm overflow-hidden"
          style={{ width: CELL_SIZE * BOARD_COLS, height: CELL_SIZE * BOARD_ROWS }}
        >
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `linear-gradient(rgba(6,182,212,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,0.5) 1px,transparent 1px)`,
              backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
            }}
          />
          {/* Scanlines */}
          <div className="absolute inset-0 pointer-events-none opacity-5"
            style={{ background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.3) 3px)" }}
          />

          {displayBoard.map((row, ri) =>
            row.map((cell, ci) => {
              if (!cell || cell === "ghost") return null;
              const color = cell as PuyoType;
              const key = `${ri},${ci}`;
              return (
                <div
                  key={key}
                  className="absolute p-[3px]"
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    top: ri * CELL_SIZE,
                    left: ci * CELL_SIZE,
                  }}
                >
                  <PuyoCell
                    color={color}
                    isClearing={clearingSet.has(key)}
                    isBlasted={blastSet.has(key)}
                    isLanding={isLandingSet.has(key)}
                    neighbors={getNeighbors(displayBoard, ri, ci, color)}
                  />
                </div>
              );
            })
          )}

          {/* Game over overlay */}
          {phase === "gameover" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
              <p className="text-3xl font-extrabold text-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.9)] mb-2">GAME OVER</p>
              <p className="text-lg text-cyan-300 mb-6">Score: {score}</p>
              <button onClick={startGame} className="px-6 py-2 border border-cyan-400 text-cyan-400 hover:bg-cyan-400/20 transition rounded tracking-widest text-sm">
                RETRY
              </button>
            </div>
          )}

          {/* Start overlay */}
          {!started && phase !== "gameover" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
              <button onClick={startGame} className="px-8 py-3 border-2 border-fuchsia-400 text-fuchsia-400 hover:bg-fuchsia-400/20 transition rounded tracking-widest font-bold text-lg shadow-[0_0_20px_rgba(232,121,249,0.5)]">
                START
              </button>
              <p className="mt-4 text-xs text-cyan-600">←→ move &nbsp;↓ fast drop &nbsp;Z/X rotate</p>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-6 min-w-[110px]">
          {/* Score */}
          <div className="border border-cyan-800 bg-cyan-950/30 rounded p-3 text-center">
            <p className="text-xs text-cyan-600 tracking-widest mb-1">SCORE</p>
            <p className="text-2xl font-bold text-cyan-300">{score.toLocaleString()}</p>
          </div>

          {/* Chain */}
          {chain > 1 && (
            <div className="border border-fuchsia-700 bg-fuchsia-950/30 rounded p-3 text-center animate-bounce">
              <p className="text-xs text-fuchsia-500 tracking-widest mb-1">CHAIN</p>
              <p className="text-3xl font-extrabold text-fuchsia-300">{chain}×</p>
            </div>
          )}

          {/* Next pair */}
          <div className="border border-cyan-800 bg-cyan-950/30 rounded p-3 text-center">
            <p className="text-xs text-cyan-600 tracking-widest mb-2">NEXT</p>
            <div className="relative mx-auto" style={{ width: CELL_SIZE * 2, height: CELL_SIZE * 2 }}>
              <div className="absolute p-[3px]" style={{ width: CELL_SIZE, height: CELL_SIZE, top: 0, left: CELL_SIZE / 2 }}>
                <PuyoCell color={nextPair.satellite.color} />
              </div>
              <div className="absolute p-[3px]" style={{ width: CELL_SIZE, height: CELL_SIZE, top: CELL_SIZE, left: CELL_SIZE / 2 }}>
                <PuyoCell color={nextPair.pivot.color} />
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="border border-cyan-900 bg-cyan-950/20 rounded p-2 text-center">
            <p className="text-[9px] text-cyan-700 tracking-widest mb-2">TYPES</p>
            <div className="flex flex-col gap-1 text-[9px] text-left">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0" />
                <span className="text-gray-500">おじゃま</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-orange-600 flex-shrink-0" />
                <span className="text-orange-700">爆発</span>
              </div>
            </div>
          </div>

          {/* Controls hint */}
          <div className="text-[10px] text-cyan-800 leading-5 text-center">
            ← → move<br />↓ drop<br />Z CCW<br />X CW
          </div>
        </div>
      </div>
    </div>
  );
}
