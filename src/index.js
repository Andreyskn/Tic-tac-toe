import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import io from 'socket.io-client';
import classNames from 'classnames';
const socket = io();

// single grid cell 
function Square(props) {
  const animate = classNames({ //conditional multy-class naming
      'square': true,
      'animate': props.value, //add class on receiving props
      'red': props.win, //add class on receiving props
    });
  return (
    <button className={animate} onClick={props.onClick} value={props.win}>
      {props.value}
    </button>
  );
}

//game board component
class Board extends React.Component {
  constructor() {
    super();
    this.state = {
      squares: Array(9).fill(null), // state of all cells
      link: null, //link to room
      roomIsFull: false,
      opponentLeft: false,
      playerXO: 'X', //player's sign (X or O)
      nextTurn: 'X',
      winLine: null, //array with winning cells
    };
  }

  componentDidMount() {
    //sending url from adress bar to the server
    socket.emit('checkUrl', window.location.pathname.replace('/',''));
    //getting 'gameStart event from server'
    socket.on('gameStart', 
      (data) => {
        this.setState({
          roomIsFull:true,
          opponentLeft:false,
          squares: Array(9).fill(null),
          nextTurn: 'X', //X is always first
        })
      }
    );
    //getting link to the room from server
    socket.on('inviteLink', 
      (link, data) => {
        if (this.state.roomIsFull) {
          this.setState({
            playerXO:'O', //second player
          })
        };
        this.setState({link:link}) //storing link in state
      }
    );
    //reset game if opponent left
    socket.on('playerLeft',
      (data) => this.setState({
        opponentLeft:true,
        roomIsFull:false,
        playerXO:'X',
      }), //asking the server for the room link
      socket.emit('checkUrl', window.location.pathname.replace('/',''))
    );
    //data from another player
    socket.on('getTurnData',
      (data, next, win) => this.setState({
        squares:data,
        nextTurn:next,
        winLine:win,
      })
    );

  }

  handleClick(i) {
    const squares = this.state.squares.slice();
    if (calculateWinner(squares) || squares[i] || 
      this.state.nextTurn != this.state.playerXO) 
    {
      return; //prevent moves when there is a winner or cell not empty or opponents turn
    }
    squares[i] = this.state.playerXO; //put sign in cell
    let nextTurn = (this.state.playerXO === 'X' ? 'O' : 'X')
    this.setState({ //passing the turn to opponent
      squares: squares,
      nextTurn: nextTurn,
    });
    setTimeout(() => {
      if (calculateWinner(squares)) {
        let winLine = calculateWinner(squares);
        this.setState({ //alter state if there is a winner
          winLine:winLine[1]
        })
      }
    }, 0);
    setTimeout(() => { //sending data to server to synchronize players
      socket.emit('sendTurnData', this.state.squares, this.state.nextTurn, this.state.winLine)
    }, 0); //pseudo delay to reset state
    
  }

  renderSquare(i) { 
    let winSquare;
    // cell rendering 
    if (this.state.winLine && this.state.winLine.indexOf(i) >= 0) {
      winSquare = 'win'; //property to mark winning cells
    } 
    return (
      <Square
        value={this.state.squares[i]} // X/O sign in cell
        onClick={() => this.handleClick(i)} //click handler
        win={winSquare}
      />
    );
  }

  render() {
    const victory = calculateWinner(this.state.squares);
    let status, link, message, turn, button;
    
    if (victory) { //show winner or player's sign
      status = 'Winner: ' + victory[0];
    } else {
      status = 'Your sign is: ' + this.state.playerXO;
    }
    //if room is full and no victory then game is still on
    if (this.state.roomIsFull && !victory) { 
      link = 'Game is in progress. Good luck!'
    } else if (victory && this.state.roomIsFull){ //if someone won - show result
      link = (this.state.playerXO === victory[0]) ? 'You win!' :
      'You lose';
      //'play again' button appears when game is over
      button = <button className='replay' onClick={() => { 
          this.setState({ //initial state
          squares: Array(9).fill(null),
          nextTurn: 'X',
          });
          setTimeout(() => { //notify server about restart
            socket.emit('sendTurnData', this.state.squares, this.state.nextTurn)
          }, 0);}}>Play again</button>//pseudo delay to reset state
    } else { //show link if no opponent
      link = <a className="link" href={this.state.link}>{this.state.link}</a>
    }
    //let user know that opponent has left
    if (this.state.opponentLeft) {
      message = <div>Your opponent has left the game.</div>
    } else if (!this.state.roomIsFull && !this.state.opponentLeft) {
      message = <div>No opponent. To start a game share this link with someone:</div>
    }
    //show who's turn is next if game is on
    if (this.state.roomIsFull && !victory) {
      turn = (this.state.nextTurn === this.state.playerXO) ? 
      "It's your turn!" : "Waiting for your opponent's turn."
    }

    return ( //board with all messages and button
      <div>
        {message}
        {link}            
        <div>{status}</div>
        <div className="status">{turn}</div>        
        <div className="board-row">
          {this.renderSquare(0)}
          {this.renderSquare(1)}
          {this.renderSquare(2)}
        </div>
        <div className="board-row">
          {this.renderSquare(3)}
          {this.renderSquare(4)}
          {this.renderSquare(5)}
        </div>
        <div className="board-row">
          {this.renderSquare(6)}
          {this.renderSquare(7)}
          {this.renderSquare(8)}
        </div>
        {button}
      </div>
    );
  }
}
//parent component
class Game extends React.Component {
  render() {
    return (
      <div className="game">
        <div className="game-board">
          <Board />
        </div>
      </div>
    );
  }
}

// ========================================

ReactDOM.render(
  <Game />,
  document.getElementById('root')
);

function calculateWinner(squares) {
  const lines = [ //possible winning combinations
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  //going through all combinations one by one. 
  //if signs in all 3 places are the same, then we have a winner
  //returning winning sign and combination
  for (let i = 0; i < lines.length; i++) { 
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return [squares[a], lines[i]];
    }
  }
  return null; //no winner yet
}