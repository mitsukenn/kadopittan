import React, { useState, useCallback, useMemo } from 'react';

// 通常ピース定義（11種類）
const NORMAL_PIECES = [
  // 1マス (1)
  [[1]],
  // 2マス (2)
  [[1, 1]],
  // 3マス I型 (3)
  [[1, 1, 1]],
  // 3マス L型 (3)
  [[1, 1], [1, 0]],
  // 4マス I型 (4)
  [[1, 1, 1, 1]],
  // 4マス L型 (4)
  [[1, 1, 1], [1, 0, 0]],
  // 4マス T型 (4)
  [[1, 1, 1], [0, 1, 0]],
  // 4マス 正方形 (4)
  [[1, 1], [1, 1]],
  // 5マス I型 (5)
  [[1, 1, 1, 1, 1]],
  // 5マス L型 (5)
  [[1, 1, 1, 1], [1, 0, 0, 0]],
  // 5マス T型 (5)
  [[1, 1, 1], [0, 1, 0], [0, 1, 0]],
];

// 7マスピース候補（ランダムで1つ選ばれる）
const SEVEN_PIECE_CANDIDATES = [
  // 7マス I型 (7)
  [[1, 1, 1, 1, 1, 1, 1]],
  // 7マス L型 (7)
  [[1, 1, 1, 1, 1, 1], [1, 0, 0, 0, 0, 0]],
  // 7マス T型 (7)
  [[1, 1, 1, 1, 1], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0]],
];

// 7マスピースの開始インデックス
const SEVEN_PIECE_START_INDEX = NORMAL_PIECES.length;

// プレイヤー用のピースセットを生成（7マスは各プレイヤーランダム1つ）
const createPlayerPieces = () => {
  return [0, 1, 2, 3].map(() => {
    const randomSevenPiece = SEVEN_PIECE_CANDIDATES[Math.floor(Math.random() * SEVEN_PIECE_CANDIDATES.length)];
    const allPieces = [...NORMAL_PIECES, randomSevenPiece];
    return allPieces.map((p, i) => ({ id: i, shape: p, used: false }));
  });
};

const BOARD_SIZE = 14;
const CELL_SIZE = 22;

const PLAYER_COLORS = {
  0: '#E53935', // 赤
  1: '#1E88E5', // 青
  2: '#FDD835', // 黄
  3: '#43A047', // 緑
};

// スタート位置用の蛍光色
const PLAYER_START_COLORS = {
  0: '#FF6B6B', // 蛍光赤
  1: '#4DABF7', // 蛍光青
  2: '#FFE066', // 蛍光黄
  3: '#69DB7C', // 蛍光緑
};

const PLAYER_NAMES = ['赤', '青', '黄', '緑'];
const PLAYER_TEAMS = [1, 2, 1, 2];

// 開始コーナー位置
const START_CORNERS = [
  { row: 0, col: 0 },
  { row: 0, col: BOARD_SIZE - 1 },
  { row: BOARD_SIZE - 1, col: 0 },
  { row: BOARD_SIZE - 1, col: BOARD_SIZE - 1 },
];

const rotatePiece = (piece) => {
  const rows = piece.length;
  const cols = piece[0].length;
  const rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rotated[c][rows - 1 - r] = piece[r][c];
    }
  }
  return rotated;
};

const flipPiece = (piece) => {
  return piece.map(row => [...row].reverse());
};

const countPieceCells = (piece) => {
  return piece.flat().filter(cell => cell === 1).length;
};

export default function BlokusGame() {
  const [board, setBoard] = useState(() => 
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(-1))
  );
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [playerPieces, setPlayerPieces] = useState(() => createPlayerPieces());
  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [currentShape, setCurrentShape] = useState(null);
  const [previewPos, setPreviewPos] = useState(null);
  const [passedPlayers, setPassedPlayers] = useState([false, false, false, false]);
  const [gameOver, setGameOver] = useState(false);
  const [firstMoves, setFirstMoves] = useState([false, false, false, false]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastPlacedCells, setLastPlacedCells] = useState([]); // 直前に置いたセル

  const remainingCells = useMemo(() => {
    return playerPieces.map(pieces => 
      pieces.filter(p => !p.used).reduce((sum, p) => sum + countPieceCells(p.shape), 0)
    );
  }, [playerPieces]);

  const teamScores = useMemo(() => ({
    1: remainingCells[0] + remainingCells[2],
    2: remainingCells[1] + remainingCells[3],
  }), [remainingCells]);

  const canPlace = useCallback((shape, startRow, startCol, player, boardState, isFirstMove) => {
    const rows = shape.length;
    const cols = shape[0].length;
    let hasCornerConnection = false;
    let touchesOwnEdge = false;
    let coversStartCorner = false;
    const startCorner = START_CORNERS[player];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape[r][c] === 1) {
          const boardRow = startRow + r;
          const boardCol = startCol + c;

          if (boardRow < 0 || boardRow >= BOARD_SIZE || boardCol < 0 || boardCol >= BOARD_SIZE) {
            return false;
          }

          if (boardState[boardRow][boardCol] !== -1) {
            return false;
          }

          if (boardRow === startCorner.row && boardCol === startCorner.col) {
            coversStartCorner = true;
          }

          const adjacents = [
            [boardRow - 1, boardCol],
            [boardRow + 1, boardCol],
            [boardRow, boardCol - 1],
            [boardRow, boardCol + 1],
          ];
          for (const [ar, ac] of adjacents) {
            if (ar >= 0 && ar < BOARD_SIZE && ac >= 0 && ac < BOARD_SIZE) {
              if (boardState[ar][ac] === player) {
                touchesOwnEdge = true;
              }
            }
          }

          const corners = [
            [boardRow - 1, boardCol - 1],
            [boardRow - 1, boardCol + 1],
            [boardRow + 1, boardCol - 1],
            [boardRow + 1, boardCol + 1],
          ];
          for (const [cr, cc] of corners) {
            if (cr >= 0 && cr < BOARD_SIZE && cc >= 0 && cc < BOARD_SIZE) {
              if (boardState[cr][cc] === player) {
                hasCornerConnection = true;
              }
            }
          }
        }
      }
    }

    if (isFirstMove) {
      return coversStartCorner && !touchesOwnEdge;
    }

    return hasCornerConnection && !touchesOwnEdge;
  }, []);

  const hasValidMove = useCallback((player, boardState, pieces, isFirst) => {
    const availablePieces = pieces[player].filter(p => !p.used);
    
    for (const piece of availablePieces) {
      let shape = piece.shape;
      for (let rotation = 0; rotation < 4; rotation++) {
        for (let flip = 0; flip < 2; flip++) {
          for (let row = -6; row < BOARD_SIZE; row++) {
            for (let col = -6; col < BOARD_SIZE; col++) {
              if (canPlace(shape, row, col, player, boardState, isFirst)) {
                return true;
              }
            }
          }
          shape = flipPiece(shape);
        }
        shape = rotatePiece(shape);
      }
    }
    return false;
  }, [canPlace]);

  const findNextPlayer = useCallback((currentP, newBoard, newPlayerPieces, newFirstMoves, newPassedPlayers) => {
    let nextPlayer = (currentP + 1) % 4;
    let attempts = 0;
    const updatedPassedPlayers = [...newPassedPlayers];

    while (attempts < 4) {
      if (updatedPassedPlayers[nextPlayer]) {
        nextPlayer = (nextPlayer + 1) % 4;
        attempts++;
        continue;
      }

      const isFirst = !newFirstMoves[nextPlayer];
      if (hasValidMove(nextPlayer, newBoard, newPlayerPieces, isFirst)) {
        return { nextPlayer, passedPlayers: updatedPassedPlayers };
      }

      updatedPassedPlayers[nextPlayer] = true;
      nextPlayer = (nextPlayer + 1) % 4;
      attempts++;
    }

    return { nextPlayer: -1, passedPlayers: updatedPassedPlayers };
  }, [hasValidMove]);

  const isPreviewValid = useMemo(() => {
    if (!currentShape || !previewPos) return false;
    const isFirstMove = !firstMoves[currentPlayer];
    return canPlace(currentShape, previewPos.row, previewPos.col, currentPlayer, board, isFirstMove);
  }, [currentShape, previewPos, firstMoves, currentPlayer, board, canPlace]);

  const confirmPlace = useCallback(() => {
    if (!previewPos || !currentShape || !isPreviewValid) return;

    const newBoard = board.map(row => [...row]);
    const rows = currentShape.length;
    const cols = currentShape[0].length;
    const placedCells = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (currentShape[r][c] === 1) {
          const boardRow = previewPos.row + r;
          const boardCol = previewPos.col + c;
          newBoard[boardRow][boardCol] = currentPlayer;
          placedCells.push({ row: boardRow, col: boardCol });
        }
      }
    }

    setBoard(newBoard);
    setLastPlacedCells(placedCells);
    
    const newPlayerPieces = playerPieces.map((pieces, idx) => 
      idx === currentPlayer 
        ? pieces.map(p => p.id === selectedPieceId ? { ...p, used: true } : p)
        : pieces
    );
    setPlayerPieces(newPlayerPieces);

    const newFirstMoves = [...firstMoves];
    if (!firstMoves[currentPlayer]) {
      newFirstMoves[currentPlayer] = true;
    }
    setFirstMoves(newFirstMoves);

    setSelectedPieceId(null);
    setCurrentShape(null);
    setPreviewPos(null);

    const { nextPlayer, passedPlayers: updatedPassedPlayers } = findNextPlayer(
      currentPlayer, newBoard, newPlayerPieces, newFirstMoves, passedPlayers
    );

    setPassedPlayers(updatedPassedPlayers);

    if (nextPlayer === -1 || updatedPassedPlayers.every(p => p)) {
      setGameOver(true);
    } else {
      setCurrentPlayer(nextPlayer);
    }
  }, [previewPos, currentShape, isPreviewValid, board, currentPlayer, playerPieces, selectedPieceId, firstMoves, passedPlayers, findNextPlayer]);

  const cancelPreview = useCallback(() => {
    setPreviewPos(null);
  }, []);

  const resetGame = () => {
    setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(-1)));
    setCurrentPlayer(0);
    setPlayerPieces(createPlayerPieces());
    setSelectedPieceId(null);
    setCurrentShape(null);
    setPreviewPos(null);
    setPassedPlayers([false, false, false, false]);
    setGameOver(false);
    setFirstMoves([false, false, false, false]);
    setMenuOpen(false);
    setLastPlacedCells([]);
  };

  const selectPiece = (piece) => {
    if (piece.used) return;
    setSelectedPieceId(piece.id);
    setCurrentShape(piece.shape);
    setPreviewPos(null);
  };

  const handleBoardTap = (row, col) => {
    if (!currentShape) return;
    setPreviewPos({ row, col });
  };

  const getPreviewCells = useCallback(() => {
    if (!currentShape || !previewPos) return [];
    const cells = [];
    const rows = currentShape.length;
    const cols = currentShape[0].length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (currentShape[r][c] === 1) {
          const boardRow = previewPos.row + r;
          const boardCol = previewPos.col + c;
          if (boardRow >= 0 && boardRow < BOARD_SIZE && boardCol >= 0 && boardCol < BOARD_SIZE) {
            cells.push({ row: boardRow, col: boardCol, valid: isPreviewValid });
          }
        }
      }
    }
    return cells;
  }, [currentShape, previewPos, isPreviewValid]);

  const previewCells = getPreviewCells();

  const currentPlayerPieces = playerPieces[currentPlayer];

  // プレビューのバウンディングボックスを計算（回転ボタン配置用）
  const previewBounds = useMemo(() => {
    if (previewCells.length === 0) return null;
    const rows = previewCells.map(c => c.row);
    const cols = previewCells.map(c => c.col);
    return {
      minRow: Math.min(...rows),
      maxRow: Math.max(...rows),
      minCol: Math.min(...cols),
      maxCol: Math.max(...cols),
    };
  }, [previewCells]);

  // 直前に置かれたセルかどうか
  const isLastPlaced = useCallback((row, col) => {
    return lastPlacedCells.some(cell => cell.row === row && cell.col === col);
  }, [lastPlacedCells]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%)',
      padding: '12px',
      fontFamily: '"Noto Sans JP", sans-serif',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap');
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 8px 2px currentColor; }
          50% { box-shadow: 0 0 16px 4px currentColor; }
        }
        
        @keyframes lastPlacedGlow {
          0%, 100% { box-shadow: inset 2px 2px 4px rgba(255,255,255,0.4), inset -1px -1px 3px rgba(0,0,0,0.2), 0 0 8px 2px rgba(255,255,255,0.6); }
          50% { box-shadow: inset 2px 2px 4px rgba(255,255,255,0.4), inset -1px -1px 3px rgba(0,0,0,0.2), 0 0 14px 4px rgba(255,255,255,0.8); }
        }
      `}</style>

      <div style={{
        maxWidth: '400px',
        margin: '0 auto',
      }}>
        {/* ヘッダー */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}>
          <div style={{ width: '40px' }}></div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 900,
            background: 'linear-gradient(90deg, #E53935, #1E88E5, #FDD835, #43A047)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            letterSpacing: '2px',
          }}>
            BLOKUS
          </h1>
          
          {/* ハンバーガーメニュー */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                width: '40px',
                height: '40px',
                background: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <span style={{ width: '18px', height: '2px', background: '#333', borderRadius: '1px' }}></span>
              <span style={{ width: '18px', height: '2px', background: '#333', borderRadius: '1px' }}></span>
              <span style={{ width: '18px', height: '2px', background: '#333', borderRadius: '1px' }}></span>
            </button>
            
            {menuOpen && (
              <div style={{
                position: 'absolute',
                top: '48px',
                right: '0',
                background: '#fff',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                padding: '8px',
                zIndex: 100,
                minWidth: '140px',
              }}>
                <button
                  onClick={resetGame}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    background: '#fff',
                    color: '#E53935',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  🔄 リセット
                </button>
              </div>
            )}
          </div>
        </div>

        {/* メニュー外クリックで閉じる */}
        {menuOpen && (
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99,
            }}
          />
        )}

        {/* スコア表示 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '10px',
          padding: '8px 12px',
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#666' }}>チーム1</div>
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
              <span style={{ width: '10px', height: '10px', background: PLAYER_COLORS[0], borderRadius: '2px' }}></span>
              <span style={{ width: '10px', height: '10px', background: PLAYER_COLORS[2], borderRadius: '2px' }}></span>
              <span style={{ fontSize: '20px', fontWeight: 900, color: '#333', marginLeft: '4px' }}>{teamScores[1]}</span>
            </div>
          </div>
          <div style={{
            fontSize: '12px',
            color: '#999',
            alignSelf: 'center',
          }}>vs</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#666' }}>チーム2</div>
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
              <span style={{ width: '10px', height: '10px', background: PLAYER_COLORS[1], borderRadius: '2px' }}></span>
              <span style={{ width: '10px', height: '10px', background: PLAYER_COLORS[3], borderRadius: '2px' }}></span>
              <span style={{ fontSize: '20px', fontWeight: 900, color: '#333', marginLeft: '4px' }}>{teamScores[2]}</span>
            </div>
          </div>
        </div>

        {/* ゲームオーバー */}
        {gameOver && (
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎉</div>
            <div style={{
              fontSize: '20px',
              fontWeight: 900,
              color: teamScores[1] < teamScores[2] ? '#E53935' : 
                     teamScores[2] < teamScores[1] ? '#1E88E5' : '#333',
              marginBottom: '16px',
            }}>
              {teamScores[1] < teamScores[2] 
                ? 'チーム1（赤・黄）の勝利！' 
                : teamScores[2] < teamScores[1]
                  ? 'チーム2（青・緑）の勝利！'
                  : '引き分け！'}
            </div>
            <button
              onClick={resetGame}
              style={{
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '24px',
                cursor: 'pointer',
              }}
            >
              もう一度
            </button>
          </div>
        )}

        {/* 全プレイヤーの残りマス表示 */}
        {!gameOver && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '8px',
            padding: '6px 10px',
            background: 'rgba(255,255,255,0.7)',
            borderRadius: '8px',
            flexWrap: 'wrap',
          }}>
            {[0, 1, 2, 3].map(player => (
              <div key={player} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px',
                opacity: player === currentPlayer ? 1 : 0.5,
                fontWeight: player === currentPlayer ? 700 : 400,
              }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  background: PLAYER_COLORS[player],
                  borderRadius: '2px',
                  boxShadow: player === currentPlayer ? `0 0 6px ${PLAYER_COLORS[player]}` : 'none',
                }}></span>
                <span style={{ fontSize: '12px', color: '#333' }}>
                  {remainingCells[player]}
                </span>
                {player === currentPlayer && (
                  <span style={{ fontSize: '10px' }}>◀</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 現在のターン表示 */}
        {!gameOver && (
          <div style={{
            textAlign: 'center',
            marginBottom: '8px',
            padding: '8px 16px',
            background: `${PLAYER_COLORS[currentPlayer]}15`,
            borderRadius: '10px',
            border: `2px solid ${PLAYER_COLORS[currentPlayer]}`,
          }}>
            <span style={{
              color: PLAYER_COLORS[currentPlayer],
              fontSize: '16px',
              fontWeight: 700,
            }}>
              {PLAYER_NAMES[currentPlayer]}のターン
            </span>
            <span style={{
              color: '#666',
              fontSize: '12px',
              marginLeft: '8px',
            }}>
              (チーム{PLAYER_TEAMS[currentPlayer]})
            </span>
          </div>
        )}

        {/* ゲームボード */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
              gap: '1px',
              background: '#ccc',
              padding: '2px',
              borderRadius: '8px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              margin: '0 auto',
              width: 'fit-content',
              position: 'relative',
            }}
          >
            {board.map((row, ri) =>
              row.map((cell, ci) => {
                const previewCell = previewCells.find(p => p.row === ri && p.col === ci);
                const isPreview = !!previewCell;
                const isLastPlacedCell = isLastPlaced(ri, ci);
                
                const startCornerPlayer = START_CORNERS.findIndex(
                  corner => corner.row === ri && corner.col === ci
                );
                const isStartCorner = startCornerPlayer !== -1 && !firstMoves[startCornerPlayer];

                // 置けない場合の黒黄ストライプスタイル
                const invalidStyle = isPreview && !previewCell.valid ? {
                  background: `repeating-linear-gradient(
                    45deg,
                    #FFD600,
                    #FFD600 4px,
                    #212121 4px,
                    #212121 8px
                  )`,
                } : {};

                return (
                  <div
                    key={`${ri}-${ci}`}
                    onClick={() => handleBoardTap(ri, ci)}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      background: cell !== -1
                        ? PLAYER_COLORS[cell]
                        : isPreview
                          ? previewCell.valid
                            ? `${PLAYER_COLORS[currentPlayer]}cc`
                            : undefined
                          : isStartCorner
                            ? PLAYER_START_COLORS[startCornerPlayer]
                            : '#fafafa',
                      borderRadius: '3px',
                      cursor: currentShape ? 'pointer' : 'default',
                      transition: 'background 0.1s',
                      boxShadow: cell !== -1 
                        ? isLastPlacedCell
                          ? undefined
                          : 'inset 2px 2px 4px rgba(255,255,255,0.4), inset -1px -1px 3px rgba(0,0,0,0.2)'
                        : isStartCorner && cell === -1
                          ? `0 0 8px ${PLAYER_START_COLORS[startCornerPlayer]}, inset 0 0 4px rgba(255,255,255,0.5)`
                          : 'none',
                      border: isStartCorner && cell === -1
                        ? `2px solid ${PLAYER_COLORS[startCornerPlayer]}`
                        : isPreview && previewCell.valid
                          ? `2px solid ${PLAYER_COLORS[currentPlayer]}`
                          : 'none',
                      color: PLAYER_START_COLORS[startCornerPlayer],
                      animation: isStartCorner && cell === -1 
                        ? 'glowPulse 1.5s ease-in-out infinite' 
                        : isLastPlacedCell
                          ? 'lastPlacedGlow 1s ease-in-out infinite'
                          : 'none',
                      ...invalidStyle,
                    }}
                  />
                );
              })
            )}
            
            {/* 盤上の回転・反転ボタン */}
            {previewPos && currentShape && previewBounds && (
              <div style={{
                position: 'absolute',
                top: `${previewBounds.minRow * (CELL_SIZE + 1) - 32}px`,
                left: `${(previewBounds.maxCol + 1) * (CELL_SIZE + 1) + 4}px`,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                zIndex: 10,
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentShape(rotatePiece(currentShape));
                  }}
                  style={{
                    width: '32px',
                    height: '32px',
                    fontSize: '16px',
                    background: '#fff',
                    border: `2px solid ${PLAYER_COLORS[currentPlayer]}`,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    fontWeight: 'bold',
                  }}
                >
                  ↻
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentShape(flipPiece(currentShape));
                  }}
                  style={{
                    width: '32px',
                    height: '32px',
                    fontSize: '16px',
                    background: '#fff',
                    border: `2px solid ${PLAYER_COLORS[currentPlayer]}`,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    fontWeight: 'bold',
                  }}
                >
                  ↔
                </button>
              </div>
            )}
          </div>

          {/* 決定・キャンセルボタン */}
          {previewPos && currentShape && (
            <div style={{
              position: 'absolute',
              bottom: '-60px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '12px',
              animation: 'slideUp 0.2s ease-out',
            }}>
              <button
                onClick={cancelPreview}
                style={{
                  padding: '12px 24px',
                  fontSize: '15px',
                  fontWeight: 700,
                  background: '#f1f3f4',
                  color: '#666',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={confirmPlace}
                disabled={!isPreviewValid}
                style={{
                  padding: '12px 32px',
                  fontSize: '15px',
                  fontWeight: 700,
                  background: isPreviewValid 
                    ? `linear-gradient(135deg, ${PLAYER_COLORS[currentPlayer]}, ${PLAYER_COLORS[currentPlayer]}cc)`
                    : '#ccc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: isPreviewValid ? 'pointer' : 'not-allowed',
                  boxShadow: isPreviewValid ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                }}
              >
                決定 ✓
              </button>
            </div>
          )}
        </div>

        {/* 自分のピース選択エリア（下部） */}
        {!gameOver && (
          <div style={{
            marginTop: previewPos ? '72px' : '12px',
            padding: '12px',
            background: '#fff',
            borderRadius: '16px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            transition: 'margin-top 0.2s',
            border: `2px solid ${PLAYER_COLORS[currentPlayer]}30`,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '10px',
              gap: '6px',
            }}>
              <span style={{
                width: '14px',
                height: '14px',
                background: PLAYER_COLORS[currentPlayer],
                borderRadius: '3px',
              }}></span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#333' }}>
                {PLAYER_NAMES[currentPlayer]}のピース
              </span>
            </div>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              justifyContent: 'center',
            }}>
              {currentPlayerPieces.filter(p => {
                // 使用済みは非表示
                if (p.used) return false;
                // 7マスピースは2ターン目（firstMovesがtrue）から解放
                if (p.id >= SEVEN_PIECE_START_INDEX && !firstMoves[currentPlayer]) {
                  return false;
                }
                return true;
              }).map(piece => {
                const isSelected = selectedPieceId === piece.id;
                const displayShape = isSelected && currentShape ? currentShape : piece.shape;
                
                return (
                  <div
                    key={piece.id}
                    style={{
                      position: 'relative',
                      padding: '8px',
                      background: isSelected ? `${PLAYER_COLORS[currentPlayer]}20` : '#f8f9fa',
                      borderRadius: '8px',
                      border: isSelected ? `2px solid ${PLAYER_COLORS[currentPlayer]}` : '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      animation: isSelected ? 'bounce 0.8s infinite' : 'none',
                    }}
                    onClick={() => selectPiece(piece)}
                  >
                    {/* 回転・反転ボタン */}
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        display: 'flex',
                        gap: '2px',
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentShape(rotatePiece(currentShape));
                          }}
                          style={{
                            width: '24px',
                            height: '24px',
                            fontSize: '12px',
                            background: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                          }}
                        >
                          ↻
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentShape(flipPiece(currentShape));
                          }}
                          style={{
                            width: '24px',
                            height: '24px',
                            fontSize: '12px',
                            background: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                          }}
                        >
                          ↔
                        </button>
                      </div>
                    )}
                    
                    {displayShape.map((row, ri) => (
                      <div key={ri} style={{ display: 'flex' }}>
                        {row.map((cell, ci) => (
                          <div
                            key={ci}
                            style={{
                              width: '10px',
                              height: '10px',
                              background: cell ? PLAYER_COLORS[currentPlayer] : 'transparent',
                              borderRadius: '2px',
                              margin: '1px',
                              boxShadow: cell ? 'inset 1px 1px 2px rgba(255,255,255,0.4)' : 'none',
                            }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ルール説明 */}
        <div style={{
          marginTop: '12px',
          padding: '10px',
          background: 'rgba(255,255,255,0.8)',
          borderRadius: '10px',
          color: '#666',
          fontSize: '11px',
          textAlign: 'center',
          lineHeight: 1.5,
        }}>
          ピースを選択 → ↻↔で調整 → ボードをタップ → 決定<br/>
          最初は角から、以降は角同士で接続（辺はNG）
        </div>
      </div>
    </div>
  );
}
