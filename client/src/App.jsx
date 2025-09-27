import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  // タイマー設定
  const [workMinutes, setWorkMinutes] = useState(0);
  const [workSeconds, setWorkSeconds] = useState(10); // テスト用に初期値設定
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(5);  // テスト用に初期値設定
  const [repetitions, setRepetitions] = useState(3);

  // タイマー状態
  const [remainingTime, setRemainingTime] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('準備'); // '準備', 'ワーク', '休憩', '終了'
  const [currentRepetition, setCurrentRepetition] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [ws, setWs] = useState(null);

  // サウンドの準備（publicフォルダにalert.mp3を配置する必要があります）
  const soundAlert = new Audio('/alert.mp3'); 

  useEffect(() => {
    // WebSocket接続の確立
    const socket = new WebSocket('ws://localhost:5000');
    setWs(socket);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'timer_update') {
        setRemainingTime(data.time);
        setCurrentPhase(data.phase);
        setCurrentRepetition(data.repetition);
        setIsTimerRunning(true);
        
        // 残り時間が3秒以下で、かつタイマーが動いている場合
        if (data.time > 0 && data.time <= 3) {
          soundAlert.play().catch(e => console.log("音の再生エラー:", e)); // エラー処理を追加
        }
      } else if (data.type === 'timer_end') {
        alert('全てのインターバルが終了しました！お疲れ様でした。');
        setRemainingTime(0);
        setCurrentPhase('終了');
        setCurrentRepetition(Number(repetitions));
        setIsTimerRunning(false);
      } else if (data.type === 'timer_reset') {
        setRemainingTime(0);
        setCurrentPhase('準備');
        setCurrentRepetition(0);
        setIsTimerRunning(false);
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  const handleStart = async () => {
    // 0以下の値が入っていないかチェック
    const workTimeInSec = (parseInt(workMinutes) * 60) + parseInt(workSeconds);
    if (workTimeInSec <= 0) {
        alert('ワーク時間は1秒以上に設定してください。');
        return;
    }

    try {
      await fetch('/api/timer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workMinutes: workMinutes || 0, 
          workSeconds: workSeconds || 0,
          breakMinutes: breakMinutes || 0,
          breakSeconds: breakSeconds || 0,
          repetitions: repetitions || 1
        }),
      });
      setIsTimerRunning(true);
      setCurrentPhase('ワーク'); // UX向上のため即座にUIを切り替え
    } catch (error) {
      console.error('タイマー開始エラー:', error);
      setIsTimerRunning(false);
    }
  };

  const handleStop = async () => {
    await fetch('/api/timer/stop', { method: 'POST' });
    setIsTimerRunning(false);
  };

  const handleReset = async () => {
    await fetch('/api/timer/reset', { method: 'POST' });
    // サーバーからの通知で状態はリセットされますが、ボタンの反応を良くするためにここでもリセット
    setRemainingTime(0);
    setCurrentPhase('準備');
    setCurrentRepetition(0);
    setIsTimerRunning(false);
  };

  const formatTime = (timeInSeconds) => {
    const min = Math.floor(timeInSeconds / 60);
    const sec = timeInSeconds % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const getPhaseColor = (phase) => {
    switch(phase) {
      case 'ワーク': return '#ff80ab'; // 鮮やかなピンク
      case '休憩': return '#c5cae9'; // ラベンダー色
      case '終了': return '#e91e63'; // 濃いピンク
      default: return '#f48fb1'; // 落ち着いたピンク
    }
  };

  return (
    <div className={`container ${isTimerRunning ? 'full-screen-mode' : ''}`}>
      
      {isTimerRunning ? (
            // 🚀 タイマー実行中の画面
            <div className="full-screen-timer">
                <div className="fs-phase-indicator" style={{ backgroundColor: getPhaseColor(currentPhase) }}>
                    {currentPhase}
                </div>
                <div className="fs-timer-display">
                    {formatTime(remainingTime)}
                </div>
                <div className="fs-repetition-info">
                    {currentPhase === 'ワーク' ? 'ワーク中' : '休憩中'} - {currentRepetition} / {repetitions}
                </div>
                <button className="fs-stop-button" onClick={handleStop}>一時停止</button>
            </div>
        ) : (
        // ⚙️ 設定フォームの表示
        <>
          <h1>インターバルタイマー</h1>
          <div className="phase-indicator" style={{ backgroundColor: getPhaseColor(currentPhase) }}>
            {currentPhase}
          </div>
          <div className="timer-display">{formatTime(remainingTime)}</div>
          
          <div className="input-group">
            <h2>ワーク時間</h2>
            <input type="number" min="0" value={workMinutes} onChange={(e) => setWorkMinutes(e.target.value)} placeholder="分" />
            <input type="number" min="0" value={workSeconds} onChange={(e) => setWorkSeconds(e.target.value)} placeholder="秒" />
          </div>
          
          <div className="input-group">
            <h2>休憩時間</h2>
            <input type="number" min="0" value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} placeholder="分" />
            <input type="number" min="0" value={breakSeconds} onChange={(e) => setBreakSeconds(e.target.value)} placeholder="秒" />
          </div>

          <div className="repetition-input">
            <h2>繰り返し回数</h2>
            <input type="number" min="1" value={repetitions} onChange={(e) => setRepetitions(e.target.value)} />
          </div>

          <div className="button-group">
            <button onClick={handleStart}>スタート</button>
            <button onClick={handleStop}>ストップ</button>
            <button onClick={handleReset}>リセット</button>
          </div>
        </>
      )}
    </div>
  );
};

export default App;