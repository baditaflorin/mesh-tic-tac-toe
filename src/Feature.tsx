import { useEffect, useState } from "react";
import type { MeshConfig, YRoom } from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };

type Mark = "X" | "O" | "";
type Game = {
  board: Mark[];
  turn: "X" | "O";
  players: { X: string | null; O: string | null };
  winner: "X" | "O" | "draw" | null;
  winLine: number[] | null;
};

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function emptyGame(): Game {
  return {
    board: ["", "", "", "", "", "", "", "", ""],
    turn: "X",
    players: { X: null, O: null },
    winner: null,
    winLine: null,
  };
}

function checkWinner(board: Mark[]): { winner: "X" | "O" | "draw" | null; line: number[] | null } {
  for (const line of WIN_LINES) {
    const [a, b, c] = line as [number, number, number];
    const v = board[a];
    if (v && v === board[b] && v === board[c]) return { winner: v as "X" | "O", line };
  }
  if (board.every((v) => v)) return { winner: "draw", line: null };
  return { winner: null, line: null };
}

export function Feature({ room }: Props) {
  if (!room) {
    return (
      <div className="ttt-screen">
        <h1>tic tac toe</h1>
        <p className="ttt-status">Connecting…</p>
      </div>
    );
  }
  return <Body room={room} />;
}

function Body({ room }: { room: YRoom }) {
  const [, rerender] = useState(0);

  useEffect(() => {
    const game = room.doc.getMap<Game[keyof Game]>("game");
    const onChange = () => rerender((n) => n + 1);
    game.observe(onChange);
    // ensure initial state exists
    if (!game.has("board")) {
      room.doc.transact(() => {
        const init = emptyGame();
        game.set("board", init.board);
        game.set("turn", init.turn);
        game.set("players", init.players);
        game.set("winner", init.winner);
        game.set("winLine", init.winLine);
      });
    }
    return () => game.unobserve(onChange);
  }, [room]);

  const game = room.doc.getMap<unknown>("game");
  const board = ((game.get("board") as Mark[] | undefined) ?? emptyGame().board).slice() as Mark[];
  const turn = (game.get("turn") as "X" | "O" | undefined) ?? "X";
  const players = (game.get("players") as Game["players"] | undefined) ?? {
    X: null,
    O: null,
  };
  const winner = game.get("winner") as Game["winner"];
  const winLine = (game.get("winLine") as number[] | null | undefined) ?? null;

  const myMark: "X" | "O" | null =
    players.X === room.peerId ? "X" : players.O === room.peerId ? "O" : null;

  const claim = (mark: "X" | "O") => {
    if (players[mark] && players[mark] !== room.peerId) return;
    const next = { ...players, [mark]: room.peerId };
    if (next.X === next.O && next.X !== null) {
      // can't be both
      const other: "X" | "O" = mark === "X" ? "O" : "X";
      next[other] = null;
    }
    game.set("players", next);
  };

  const release = (mark: "X" | "O") => {
    if (players[mark] !== room.peerId) return;
    game.set("players", { ...players, [mark]: null });
  };

  const play = (i: number) => {
    if (winner) return;
    if (board[i]) return;
    if (myMark !== turn) return;
    const next = board.slice();
    next[i] = myMark;
    const { winner: w, line } = checkWinner(next);
    room.doc.transact(() => {
      game.set("board", next);
      if (w) {
        game.set("winner", w);
        game.set("winLine", line);
      } else {
        game.set("turn", turn === "X" ? "O" : "X");
      }
    });
  };

  const rematch = () => {
    room.doc.transact(() => {
      const init = emptyGame();
      game.set("board", init.board);
      game.set("turn", init.turn);
      game.set("winner", init.winner);
      game.set("winLine", init.winLine);
      // keep players assigned
    });
  };

  let statusMsg: string;
  if (winner === "draw") statusMsg = "draw — rematch?";
  else if (winner) statusMsg = `${winner} wins!`;
  else if (!players.X || !players.O) statusMsg = "claim a side to start";
  else statusMsg = `${turn} to move`;

  return (
    <div className="ttt-screen">
      <header className="ttt-header">
        <h1>tic tac toe</h1>
        <p className="ttt-status">{statusMsg}</p>
      </header>

      <div className="ttt-roles">
        {(["X", "O"] as const).map((m) => {
          const taken = players[m];
          const mine = taken === room.peerId;
          return (
            <button
              key={m}
              type="button"
              className={`ttt-role ${mine ? "is-mine" : taken ? "is-taken" : ""}`}
              onClick={() => (mine ? release(m) : claim(m))}
              disabled={!!taken && !mine}
            >
              <span className="ttt-role-mark">{m}</span>
              <span className="ttt-role-status">
                {mine ? "you" : taken ? "taken" : "open — claim"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="ttt-board">
        {board.map((cell, i) => {
          const inWin = winLine?.includes(i) ?? false;
          const canPlay = !winner && !cell && myMark === turn;
          return (
            <button
              key={i}
              type="button"
              className={`ttt-cell ${cell ? "ttt-" + cell.toLowerCase() : ""} ${
                inWin ? "is-win" : ""
              }`}
              onClick={() => play(i)}
              disabled={!canPlay}
              aria-label={`cell ${i + 1} ${cell || "empty"}`}
            >
              {cell}
            </button>
          );
        })}
      </div>

      <div className="ttt-actions">
        <button
          type="button"
          className="ttt-rematch"
          onClick={rematch}
          disabled={!winner && board.every((c) => !c)}
        >
          rematch
        </button>
      </div>

      <p className="ttt-fineprint">
        you are <strong>{myMark ?? "spectating"}</strong> · {room.peerCount + 1} present
      </p>
    </div>
  );
}
