import { print, askQuestion } from "./io.mjs";
import { ANSI } from "./ansi.mjs";
import DICTIONARY from "./language.mjs";
import showSplashScreen from "./splash.mjs";

const GAME_BOARD_SIZE = 3;
const PLAYER_1 = 1;
const PLAYER_2 = -1;
const EMPTY_CELL = 0;
const MENU_CHOICES = {
    MENU_CHOICE_START_GAME: 1,
    MENU_CHOICE_SHOW_SETTINGS: 2,
    MENU_CHOICE_EXIT_GAME: 3
};
const NO_CHOICE = -1;
const GAME_MODE = {
    PVP: 1,
    PVC: 2
};

let language = DICTIONARY.en;
let gameboard;
let currentPlayer;
let gameMode;

clearScreen();
showSplashScreen();
setTimeout(start, 2500);

async function start() {
    do {
        let chosenAction = NO_CHOICE;
        chosenAction = await showMenu();

        if (chosenAction == MENU_CHOICES.MENU_CHOICE_START_GAME) {
            await chooseGameMode();
            await runGame();
        } else if (chosenAction == MENU_CHOICES.MENU_CHOICE_SHOW_SETTINGS) {
            await showSettings();
        } else if (chosenAction == MENU_CHOICES.MENU_CHOICE_EXIT_GAME) {
            clearScreen();
            process.exit();
        }
    } while (true);
}

async function runGame() {
    let isPlaying = true;
    while (isPlaying) {
        initializeGame();
        isPlaying = await playGame();
    }
}

async function showMenu() {
    let choice = -1;
    let validChoice = false;

    while (!validChoice) {
        clearScreen();
        print(ANSI.COLOR.YELLOW + language.MENU_TITLE + ANSI.RESET);
        print("1. " + language.MENU_PLAY_GAME);
        print("2. " + language.MENU_SETTINGS);
        print("3. " + language.MENU_EXIT_GAME);

        choice = await askQuestion("");

        if ([MENU_CHOICES.MENU_CHOICE_START_GAME, MENU_CHOICES.MENU_CHOICE_SHOW_SETTINGS, MENU_CHOICES.MENU_CHOICE_EXIT_GAME].includes(Number(choice))) {
            validChoice = true;
        }
    }
    return Number(choice);
}

async function showSettings() {
    let languageChoice = await askQuestion(language.CHANGE_LANGUAGE_PROMPT);
    if (languageChoice.toLowerCase() === "en") {
        language = DICTIONARY.en;
    } else if (languageChoice.toLowerCase() === "no") {
        language = DICTIONARY.no;
    }
}

async function chooseGameMode() {
    let modeChoice = await askQuestion(language.CHOOSE_GAME_MODE);
    if (Number(modeChoice) === GAME_MODE.PVP) {
        gameMode = GAME_MODE.PVP;
    } else if (Number(modeChoice) === GAME_MODE.PVC) {
        gameMode = GAME_MODE.PVC;
    }
}

async function playGame() {
    let outcome;
    do {
        clearScreen();
        showGameBoardWithCurrentState();
        showHUD();

        let move;
        if (gameMode === GAME_MODE.PVC && currentPlayer === PLAYER_2) {
            move = getComputerMove();
        } else {
            move = await getGameMoveFromCurrentPlayer();
        }

        updateGameBoardState(move);
        outcome = evaluateGameState();
        changeCurrentPlayer();
    } while (outcome == 0);

    showGameSummary(outcome);
    return await askWantToPlayAgain();
}

async function askWantToPlayAgain() {
    let answer = await askQuestion(language.PLAY_AGAIN_QUESTION);
    return answer && answer.toLowerCase()[0] === language.CONFIRM;
}

function showGameSummary(outcome) {
    clearScreen();
    if (outcome === PLAYER_1) {
        print(ANSI.COLOR.GREEN + language.PLAYER_ONE_WINS + ANSI.RESET);
    } else if (outcome === PLAYER_2) {
        print(ANSI.COLOR.GREEN + language.PLAYER_TWO_WINS + ANSI.RESET);
    } else {
        print(ANSI.COLOR.RED + language.GAME_DRAW + ANSI.RESET);
    }
    showGameBoardWithCurrentState();
    print("GAME OVER");
}

function changeCurrentPlayer() {
    currentPlayer *= -1;
}

function evaluateGameState() {
    let state = 0;

    for (let row = 0; row < GAME_BOARD_SIZE; row++) {
        let sum = 0;
        for (let col = 0; col < GAME_BOARD_SIZE; col++) {
            sum += gameboard[row][col];
        }
        if (Math.abs(sum) === GAME_BOARD_SIZE) {
            state = sum;
            break;
        }
    }

    for (let col = 0; col < GAME_BOARD_SIZE; col++) {
        let sum = 0;
        for (let row = 0; row < GAME_BOARD_SIZE; row++) {
            sum += gameboard[row][col];
        }
        if (Math.abs(sum) === GAME_BOARD_SIZE) {
            state = sum;
            break;
        }
    }

    let sumDiagonal1 = 0;
    let sumDiagonal2 = 0;
    for (let i = 0; i < GAME_BOARD_SIZE; i++) {
        sumDiagonal1 += gameboard[i][i];
        sumDiagonal2 += gameboard[i][GAME_BOARD_SIZE - i - 1];
    }
    if (Math.abs(sumDiagonal1) === GAME_BOARD_SIZE) {
        state = sumDiagonal1;
    } else if (Math.abs(sumDiagonal2) === GAME_BOARD_SIZE) {
        state = sumDiagonal2;
    }

    let isDraw = gameboard.flat().every(cell => cell !== EMPTY_CELL);
    if (isDraw && state === 0) {
        return 0.5;
    }

    return state / GAME_BOARD_SIZE;
}

function updateGameBoardState(move) {
    const ROW_ID = 0;
    const COLUMN_ID = 1;
    gameboard[move[ROW_ID] - 1][move[COLUMN_ID] - 1] = currentPlayer;
}

async function getGameMoveFromCurrentPlayer() {
    let position = null;
    do {
        let rawInput = await askQuestion("Place your mark at (row column): ");
        position = rawInput.split(" ").map(Number);
    } while (!isValidPositionOnBoard(position));
    return position;
}

function getComputerMove() {
    let emptyCells = [];
    for (let row = 0; row < GAME_BOARD_SIZE; row++) {
        for (let col = 0; col < GAME_BOARD_SIZE; col++) {
            if (gameboard[row][col] === EMPTY_CELL) {
                emptyCells.push([row + 1, col + 1]);
            }
        }
    }
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function isValidPositionOnBoard(position) {
    if (position.length < 2) {
        return false;
    }

    let row = position[0];
    let col = position[1];

    if (
        isNaN(row) || isNaN(col) ||
        row < 1 || row > GAME_BOARD_SIZE ||
        col < 1 || col > GAME_BOARD_SIZE ||
        gameboard[row - 1][col - 1] !== EMPTY_CELL
    ) {
        return false;
    }

    return true;
}

function showHUD() {
    let playerDescription = currentPlayer === PLAYER_1 ? language.PLAYER_ONE : language.PLAYER_TWO;
    print(`Player ${playerDescription}, it's your turn`);
}

function showGameBoardWithCurrentState() {
    for (let currentRow = 0; currentRow < GAME_BOARD_SIZE; currentRow++) {
        let rowOutput = "";
        for (let currentCol = 0; currentCol < GAME_BOARD_SIZE; currentCol++) {
            let cell = gameboard[currentRow][currentCol];
            if (cell === EMPTY_CELL) {
                rowOutput += "_ ";
            } else if (cell === PLAYER_1) {
                rowOutput += ANSI.COLOR.BLUE + "X " + ANSI.RESET;
            } else {
                rowOutput += ANSI.COLOR.RED + "O " + ANSI.RESET;
            }
        }
        print(rowOutput);
    }
}

function initializeGame() {
    gameboard = createGameBoard();
    currentPlayer = PLAYER_1;
}

function createGameBoard() {
    let newBoard = new Array(GAME_BOARD_SIZE).fill().map(() => new Array(GAME_BOARD_SIZE).fill(EMPTY_CELL));
    return newBoard;
}

function clearScreen() {
    console.log(ANSI.CLEAR_SCREEN, ANSI.CURSOR_HOME, ANSI.RESET);
}

//#endregion