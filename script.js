// script.js (Modified)
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const initialControls = document.getElementById('initial-controls');
    const gameContainer = document.getElementById('game-container');
    const playerHandElement = document.getElementById('player-hand');
    const computerHandElement = document.getElementById('computer-hand');
    const tablePileElement = document.getElementById('table-pile'); // The container for the stack
    const deckElement = document.getElementById('deck');
    const deckCountElement = document.getElementById('deck-count');
    const lastCardShownElement = document.getElementById('last-card-shown');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const messageArea = document.getElementById('message-area');
    const initialMessage = document.getElementById('initial-message');
    const playerTakenCountElement = document.getElementById('player-taken-count');
    const playerBanksCountElement = document.getElementById('player-banks-count');
    const computerTakenCountElement = document.getElementById('computer-taken-count');
    const computerBanksCountElement = document.getElementById('computer-banks-count');
    const resultsScreen = document.getElementById('results-screen');
    const playerResultsCardsContainer = document.getElementById('player-results-cards');
    const computerResultsCardsContainer = document.getElementById('computer-results-cards');
    const newGameButton = document.getElementById('new-game-button');
    const toggleRulesButton = document.getElementById('toggle-rules-button');
    const rulesContainer = document.getElementById('rules-container');
    const computerInfoDiv = document.querySelector('#computer-area .taken-pile-info');
    const playerInfoDiv = document.querySelector('#player-area .taken-pile-info');

    // --- Game Constants ---
    const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
    const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const CARD_VALUES = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    const POINT_CARDS = ['10', 'J', 'Q', 'K', 'A']; // Cards worth 1 point
    const CLUBS_2 = { suit: 'clubs', rank: '2' }; // 2 of Clubs is worth 1 point
    const BANKA_POINTS = 10;
    const MOST_CARDS_POINTS = 4;
    const MAX_HAND_SIZE = 6;
    const TABLE_STACK_OFFSET_X = 3;
    const TABLE_STACK_OFFSET_Y = 2;
    const MAX_VISIBLE_STACK_CARDS = 5;
    const PLAYER = 'player';
    const COMPUTER = 'computer';

    // --- Animation & Timing Constants ---
    const DEAL_DELAY_MS = 80;
    const COUNT_DECREMENT_DELAY_MS = DEAL_DELAY_MS; // Match deal delay
    const COUNT_ANIMATION_DURATION_MS = 200; // Match CSS animation duration for countUpdate
    const DEAL_ANIMATION_DURATION_MS = 450;
    const COMPUTER_TURN_DELAY_MIN = 700;
    const COMPUTER_TURN_DELAY_MAX = 1300;
    const COMPUTER_SHOW_CARD_DELAY_MS = 600; // Delay to show computer's card before taking pile
    // const TAKE_ANIMATION_DURATION_MS = 550; // No longer needed for pile take
    const NEXT_TURN_DELAY = 300; // Delay after adding card
    const MESSAGE_DELAY = 1200;

    // --- Game State Variables ---
    let deck = [];
    let playerHand = [];
    let computerHand = [];
    let tablePile = []; // Array of card objects representing the logical pile
    let playerTakenCards = [];
    let computerTakenCards = [];
    let netBankaDifference = 0; // Positive for player, negative for computer
    let bankaEventsLog = []; // Niz za praćenje Banka događaja redom
    let lastShownCard = null; // Informational card shown at the start
    let isPlayerTurn = true;
    let gameInProgress = false;
    let lastTaker = null; // Who took the last pile ('player' or 'computer')
    let turnInProgress = false; // Prevents actions during animations/AI thinking

    // --- Helper: Get Element Position (Center) ---
    function getElementPosition(element) {
        if (!element) {
            console.warn("getElementPosition: Null element provided. Using screen center.");
            return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        }
        try {
            const rect = element.getBoundingClientRect();
            return {
                x: rect.left + window.scrollX + rect.width / 2,
                y: rect.top + window.scrollY + rect.height / 2
            };
        } catch (e) {
            console.error("Error getting element position:", e, "Element:", element);
            return { x: window.innerWidth / 2, y: window.innerHeight / 2 }; // Fallback
        }
    }

    // --- Helper: Get Position of a Specific Slot in a Hand/Container ---
    function getTargetSlotPosition(container, index) {
        if (!container) return getElementPosition(null); // Fallback
        const children = container.children;
        const targetIndex = Math.max(0, Math.min(index, children.length - 1)); // Clamp index

        if (children[targetIndex]) {
            return getElementPosition(children[targetIndex]);
        } else if (children.length > 0) {
            const lastChild = children[children.length - 1];
            const lastChildPos = getElementPosition(lastChild);
            const cardWidth = lastChild.offsetWidth || 60;
            const gap = parseInt(window.getComputedStyle(container).gap) || 3;
            return { x: lastChildPos.x + cardWidth / 2 + gap, y: lastChildPos.y };
        } else {
            return getElementPosition(container);
        }
    }

    // --- Animation Function (Simplified for removal of pile take) ---
    function animateCardMove(card, targetContainer, options = {}) {
        return new Promise(resolve => {
            const {
                targetSlotIndex = -1,
                isHidden = false,
                duration = DEAL_ANIMATION_DURATION_MS,
                // isTakeAnimation = false, // Removed concept for pile take
                cardElementToAnimate = null,
                // takeTargetElement = null, // Removed concept for pile take
                startPosOverride = null,
                endPosOverride = null
            } = options;

            const startPos = startPosOverride || getElementPosition(deckElement);

            let endPos = endPosOverride;
            if (!endPos) {
                if (targetSlotIndex !== -1 && targetContainer) {
                    endPos = getTargetSlotPosition(targetContainer, targetSlotIndex);
                } else if (targetContainer) {
                    endPos = getElementPosition(targetContainer);
                } else {
                    console.warn("animateCardMove: No valid target specified.");
                    endPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
                }
            }

            const cardToAnimate = cardElementToAnimate || createCardElement(card, isHidden);
            const cardRect = cardToAnimate.getBoundingClientRect();
            const cardWidth = cardRect.width > 0 ? cardRect.width : 60;
            const cardHeight = cardRect.height > 0 ? cardRect.height : 90;

            if (!cardElementToAnimate) {
                cardToAnimate.style.position = 'fixed';
                cardToAnimate.style.left = `${startPos.x - cardWidth / 2}px`;
                cardToAnimate.style.top = `${startPos.y - cardHeight / 2}px`;
                cardToAnimate.style.transform = 'translate(0, 0) scale(1)';
                cardToAnimate.style.zIndex = '1000';
                cardToAnimate.style.opacity = '1';
                document.body.appendChild(cardToAnimate);
            } else {
                cardToAnimate.style.position = 'fixed';
                cardToAnimate.style.zIndex = '1000';
            }
            cardToAnimate.classList.add('card-animating');

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const currentRect = cardToAnimate.getBoundingClientRect();
                    const currentX = currentRect.left + currentRect.width / 2;
                    const currentY = currentRect.top + currentRect.height / 2;
                    const targetX = endPos.x - currentX;
                    const targetY = endPos.y - currentY;

                    // Simplified transform, no special scaling for taking
                    cardToAnimate.style.transform = `translate(${targetX}px, ${targetY}px) scale(0.95)`;
                    cardToAnimate.style.opacity = '1'; // Always visible during move
                });
            });

            setTimeout(() => {
                if (cardToAnimate.parentNode === document.body) {
                    document.body.removeChild(cardToAnimate);
                } else if (cardElementToAnimate) {
                    cardToAnimate.classList.remove('card-animating'); // Removed 'card-taking'
                    cardToAnimate.style.position = '';
                    cardToAnimate.style.transform = '';
                    cardToAnimate.style.opacity = '';
                    cardToAnimate.style.zIndex = '';
                }
                resolve();
            }, duration);
        });
    }


    // --- Core Game Logic ---
    function createDeck() {
        deck = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                deck.push({
                    suit, rank, value: CARD_VALUES[rank], id: `card_${suit}_${rank}`,
                    image: `assets/cards/card_${suit}_${rank}.png`,
                    points: calculateCardPoints({ suit, rank })
                });
            }
        }
        console.log("Deck created:", deck.length);
    }

    function calculateCardPoints(card) {
        if (!card) return 0;
        return (POINT_CARDS.includes(card.rank) || (card.suit === CLUBS_2.suit && card.rank === CLUBS_2.rank)) ? 1 : 0;
    }

    function shuffleDeck() {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        console.log("Deck shuffled.");
    }

    function scheduleCountDecrement(delay) {
        setTimeout(() => {
            try {
                // Find the deck count element reliably inside the timeout
                const deckCountElement = document.getElementById('deck-count');
                const deckElement = document.getElementById('deck');
                if (!deckCountElement || !deckElement) {
                    console.error("Deck count or deck element not found during scheduled decrement.");
                    return;
                }

                const currentText = deckCountElement.textContent;
                const currentCount = parseInt(currentText, 10);

                if (!isNaN(currentCount) && currentCount > 0) {
                    const newCount = currentCount - 1;
                    deckCountElement.textContent = newCount; // Update the number

                    // Trigger the "pop" animation
                    deckCountElement.classList.remove('count-updating'); // Ensure it can re-trigger
                    // Force reflow/repaint before adding the class again
                    void deckCountElement.offsetWidth; // Read offsetWidth to force reflow
                    deckCountElement.classList.add('count-updating');

                    // Remove animation class after it finishes
                    // Use a separate timeout to remove the class
                    setTimeout(() => {
                        if (deckCountElement.classList.contains('count-updating')) {
                             deckCountElement.classList.remove('count-updating');
                        }
                    }, COUNT_ANIMATION_DURATION_MS); // Match CSS animation duration

                    // Hide deck visually if count reaches 0
                    if (newCount === 0) {
                        deckElement.style.display = 'none';
                    } else {
                        deckElement.style.display = 'block'; // Ensure visible otherwise
                    }
                } else {
                    // If current text is not a number or already 0, try syncing with deck.length
                    console.warn(`Could not parse deck count ('${currentText}') or count already 0 during scheduled decrement. Syncing...`);
                    // Find the actual deck array (assuming it's accessible in this scope)
                    if (typeof deck !== 'undefined') {
                         updateDeckCount(true); // Sync display with actual deck length
                    } else {
                         console.error("Deck array not accessible for syncing count.");
                    }
                }
            } catch (error) {
                console.error("Error during scheduled count decrement:", error);
                 if (typeof deck !== 'undefined') {
                    updateDeckCount(true); // Attempt to recover by syncing
                 }
            }
        }, delay); // Use the provided delay
    }

    // --- Game Setup & Reset ---
    function resetToInitialState() {
        console.log("--- Resetting to Initial State ---");
        // --- DOM Element References --- (Ensure these are defined in the outer scope)
        const initialControls = document.getElementById('initial-controls');
        const gameContainer = document.getElementById('game-container');
        const playerHandElement = document.getElementById('player-hand');
        const computerHandElement = document.getElementById('computer-hand');
        const tablePileElement = document.getElementById('table-pile');
        const deckElement = document.getElementById('deck');
        const deckCountElement = document.getElementById('deck-count');
        const lastCardShownElement = document.getElementById('last-card-shown');
        const restartButton = document.getElementById('restart-button');
        const messageArea = document.getElementById('message-area');
        const initialMessage = document.getElementById('initial-message');
        const resultsScreen = document.getElementById('results-screen');
        const playerResultsCardsContainer = document.getElementById('player-results-cards');
        const computerResultsCardsContainer = document.getElementById('computer-results-cards');
        const rulesContainer = document.getElementById('rules-container');
        const toggleRulesButton = document.getElementById('toggle-rules-button');

        // Reset game state variables (assuming they are defined in the outer scope)
        deck = []; playerHand = []; computerHand = []; tablePile = [];
        playerTakenCards = []; computerTakenCards = [];
        bankaEventsLog = [];
        netBankaDifference = 0; lastTaker = null; lastShownCard = null;
        gameInProgress = false; isPlayerTurn = true; turnInProgress = false;

        // Reset UI elements
        initialControls.classList.remove('hidden');
        gameContainer.classList.add('hidden');
        resultsScreen.classList.add('hidden');

        initialMessage.textContent = 'Dobrodošli! Kliknite Start.';
        messageArea.textContent = '';
        playerHandElement.innerHTML = ''; addPlaceholders(playerHandElement, MAX_HAND_SIZE);
        computerHandElement.innerHTML = ''; addPlaceholders(computerHandElement, MAX_HAND_SIZE);
        tablePileElement.innerHTML = ''; addPlaceholders(tablePileElement, 1);
        tablePileElement.style.minHeight = '100px';

        lastCardShownElement.innerHTML = ''; lastCardShownElement.className = 'card-placeholder';

        // Ensure deck count element is reset correctly
        if (deckCountElement) {
            deckCountElement.textContent = '0';
            deckCountElement.classList.remove('count-updating'); // Clear animation class
        }
        if (deckElement) {
            deckElement.style.display = 'none'; // Initially hidden
        }

        if (restartButton) restartButton.style.display = 'none';

        // Reset results screen elements
        if (playerResultsCardsContainer) playerResultsCardsContainer.innerHTML = '';
        if (computerResultsCardsContainer) computerResultsCardsContainer.innerHTML = '';
        const resultElements = [
            'results-player-card-points', 'results-player-most-cards-points',
            'results-player-banka-points', 'results-player-total-score',
            'results-computer-card-points', 'results-computer-most-cards-points',
            'results-computer-banka-points', 'results-computer-total-score',
            'results-winner-message'
        ];
        resultElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = id.includes('score') || id.includes('points') ? '0' : '';
        });


        if (rulesContainer && toggleRulesButton) {
             rulesContainer.classList.add('hidden');
             toggleRulesButton.textContent = 'Prikaži Pravila';
        }
        updateTakenCounts(); // Update visual counts for taken piles/banks
        console.log("--- Initial State Set ---");
    }

    // --- Start Game (Deal cards with animation) ---
    async function startGame() {
        console.log("--- Starting Game ---");
        resetToInitialState(); // Resets everything including deck count text to 0

        // Find elements needed within this function scope
        const initialControls = document.getElementById('initial-controls');
        const gameContainer = document.getElementById('game-container');
        const resultsScreen = document.getElementById('results-screen');
        const deckElement = document.getElementById('deck'); // Needed for visibility
        const messageArea = document.getElementById('message-area');
        const tablePileElement = document.getElementById('table-pile');
        const playerHandElement = document.getElementById('player-hand');
        const computerHandElement = document.getElementById('computer-hand');
        const restartButton = document.getElementById('restart-button');

        // Basic checks
        if (!initialControls || !gameContainer || !resultsScreen || !deckElement || !messageArea || !tablePileElement || !playerHandElement || !computerHandElement || !restartButton) {
            console.error("One or more essential elements not found in startGame.");
            return; // Stop execution if elements are missing
        }

        // Hide initial controls, show game container
        initialControls.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        resultsScreen.classList.add('hidden');

        createDeck(); // Creates the 'deck' array
        shuffleDeck();

        // *** Set initial count and display deck BEFORE dealing ***
        updateDeckCount(); // Set the initial number (e.g., 52)
        deckElement.style.display = 'block';

        // Check if deck is valid and has enough cards
        if (typeof deck === 'undefined' || deck.length < 4 + MAX_HAND_SIZE * 2) {
            messageArea.textContent = "Greška: Nema dovoljno karata za početak.";
            console.error("Deck not defined or not enough cards to start the game.");
            return;
        }

        lastShownCard = deck[0]; // Show the bottom card (which is at index 0 after shuffle)
        displayLastCard(lastShownCard);
        messageArea.textContent = `Zadnja karta (informativno): ${getCardDisplayName(lastShownCard?.rank)} ${getSuitSymbol(lastShownCard?.suit)}. Dijelim...`;

        turnInProgress = true; // Block interactions during dealing
        enableDisablePlayerCards(); // Disable player cards visually

        const dealPromises = [];
        let currentDealDelay = 0; // Tracks the delay for the next animation/decrement
        const tempTablePile = [];

        // Clear and prepare UI areas for cards
        tablePileElement.innerHTML = ''; addPlaceholders(tablePileElement, 4);
        playerHandElement.innerHTML = ''; addPlaceholders(playerHandElement, MAX_HAND_SIZE);
        computerHandElement.innerHTML = ''; addPlaceholders(computerHandElement, MAX_HAND_SIZE);

        // Deal to table
        for (let i = 0; i < 4; i++) {
            if (deck.length > 0) {
                const card = deck.pop(); // Take card from deck array
                // *** Schedule the count decrement visualization ***
                scheduleCountDecrement(currentDealDelay);
                tempTablePile.push(card); // Add to temporary logical pile
                const tableSlotIndex = i;

                // --- Card Animation Logic (using animateCardMove) ---
                const animationPromise = new Promise(resolve => setTimeout(resolve, currentDealDelay))
                    .then(() => {
                         const placeholder = tablePileElement.children[tableSlotIndex];
                         if (placeholder && placeholder.classList.contains('card-placeholder')) {
                             const targetPos = getElementPosition(placeholder);
                             return animateCardMove(card, null, { // Animate card (using the popped 'card' object)
                                 startPosOverride: getElementPosition(deckElement),
                                 endPosOverride: targetPos
                             });
                         } else { return Promise.resolve(); }
                    });
                // --- Update UI after animation ---
                animationPromise.then(() => {
                    // This part runs *after* the animation completes
                    const placeholder = tablePileElement.children[tableSlotIndex];
                    if (placeholder && placeholder.classList.contains('card-placeholder')) {
                        // Create the static card element for the table
                        const newCardElement = createCardElement(card, false);
                        // Position it correctly within the pile container (this might be adjusted by renderTablePile later)
                        newCardElement.style.position = 'absolute';
                        newCardElement.style.left = '50%';
                        newCardElement.style.top = '0px';
                        newCardElement.style.transform = 'translateX(-50%)';
                        newCardElement.style.zIndex = tableSlotIndex + 1; // Ensure stacking order initially
                        tablePileElement.replaceChild(newCardElement, placeholder);
                    }
                    // Optionally call renderTablePile here if needed immediately,
                    // but it will be called after all dealing anyway.
                     // renderTablePile();
                });
                dealPromises.push(animationPromise);
                currentDealDelay += DEAL_DELAY_MS; // Increment delay for the next card
            }
        }

        const tempPlayerHand = [];
        const tempComputerHand = [];

        // Deal to hands
        for (let i = 0; i < MAX_HAND_SIZE; i++) {
            // Player card
            if (deck.length > 0) {
                const playerCard = deck.pop();
                // *** Schedule the count decrement ***
                scheduleCountDecrement(currentDealDelay);
                tempPlayerHand.push(playerCard);
                const playerSlotIndex = i;

                // --- Player Card Animation ---
                const playerAnimPromise = new Promise(resolve => setTimeout(resolve, currentDealDelay))
                    .then(() => animateCardMove(playerCard, playerHandElement, { targetSlotIndex: playerSlotIndex }));
                // --- Update Player Hand UI ---
                playerAnimPromise.then(() => {
                    const placeholder = playerHandElement.children[playerSlotIndex];
                    if (placeholder && placeholder.classList.contains('card-placeholder')) {
                        playerHandElement.replaceChild(createCardElement(playerCard, false), placeholder);
                    } else { console.warn(`Player placeholder ${playerSlotIndex} not found.`); }
                });
                dealPromises.push(playerAnimPromise);
                currentDealDelay += DEAL_DELAY_MS;
            }
            // Computer card
            if (deck.length > 0) {
                const computerCard = deck.pop();
                // *** Schedule the count decrement ***
                scheduleCountDecrement(currentDealDelay);
                tempComputerHand.push(computerCard);
                const computerSlotIndex = i;

                // --- Computer Card Animation ---
                const compAnimPromise = new Promise(resolve => setTimeout(resolve, currentDealDelay))
                    .then(() => animateCardMove(computerCard, computerHandElement, { isHidden: true, targetSlotIndex: computerSlotIndex }));
                // --- Update Computer Hand UI ---
                compAnimPromise.then(() => {
                    const placeholder = computerHandElement.children[computerSlotIndex];
                    if (placeholder && placeholder.classList.contains('card-placeholder')) {
                        computerHandElement.replaceChild(createCardElement(computerCard, true), placeholder);
                    } else { console.warn(`Computer placeholder ${computerSlotIndex} not found.`); }
                });
                dealPromises.push(compAnimPromise);
                currentDealDelay += DEAL_DELAY_MS;
            }
        }

        // Wait for all dealing animations to visually complete
        await Promise.all(dealPromises);
        console.log("All deal animations complete.");

        // *** Final sync after all animations/decrements should be done ***
        // Use a small delay to ensure scheduled decrements have likely finished processing
        const syncDelay = currentDealDelay + 100; // Wait a bit longer than the last scheduled action
        setTimeout(() => {
            console.log("Final deck count sync after initial deal.");
            updateDeckCount(true); // Sync display with actual deck.length, just in case
        }, syncDelay);

        // Update the actual game state arrays
        tablePile = [...tempTablePile];
        playerHand = [...tempPlayerHand];
        computerHand = [...tempComputerHand];

        renderTablePile(); // Render the initial table pile correctly stacked

        // Use a timeout slightly longer than the sync timeout to start the game flow
        const gameStartDelay = syncDelay + 150; // e.g., 150ms after the sync attempt
        setTimeout(() => {
            gameInProgress = true;
            turnInProgress = false; // Allow interactions now
            isPlayerTurn = true; // Player starts
            if (restartButton) restartButton.style.display = 'inline-block'; // Show restart button
            messageArea.textContent = "Igra je počela. Tvoj je red.";
            enableDisablePlayerCards(); // Enable player cards for interaction
            console.log("--- Game Start Complete - Player's Turn ---");
        }, gameStartDelay);
    }

    function setupForNewGame() {
        console.log("--- Setting up for New Game ---");
        resetToInitialState();
    }

    // --- UI Update Functions ---
    function addPlaceholders(element, count) {
        const safeCount = Math.max(0, count);
        for (let i = 0; i < safeCount; i++) {
            const p = document.createElement('div');
            p.className = 'card-placeholder';
            element.appendChild(p);
        }
    }

    function displayLastCard(card) {
        lastCardShownElement.innerHTML = '';
        if (!card) {
            lastCardShownElement.className = 'card-placeholder';
            return;
        };
        const cardElement = createCardElement(card, false);
        lastCardShownElement.appendChild(cardElement);
        lastCardShownElement.className = '';
    }

    function createCardElement(card, isHidden = false) {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');
        if (card && card.id) cardElement.dataset.id = card.id;
        if (card && card.rank) cardElement.dataset.rank = card.rank;
        if (card && card.suit) cardElement.dataset.suit = card.suit;

        if (isHidden) {
            cardElement.classList.add('card-back');
            cardElement.style.backgroundImage = `url('assets/cards/card_back.png')`;
        } else if (card && card.image) {
            cardElement.style.backgroundImage = `url('${card.image}')`;
        } else {
            cardElement.classList.add('card-placeholder');
            cardElement.style.backgroundImage = '';
        }
        return cardElement;
    }

    function renderHand(hand, element, isHidden) {
        element.innerHTML = '';
        const handSize = hand ? hand.length : 0;

        hand.forEach(card => {
            if (!card) { console.warn("Rendering null/undefined card in hand state array."); return; }
            element.appendChild(createCardElement(card, isHidden));
        });

        const placeholdersNeeded = MAX_HAND_SIZE - handSize;
        addPlaceholders(element, placeholdersNeeded);
    }

    function renderTablePile() {
        tablePileElement.innerHTML = '';

        if (!tablePile || tablePile.length === 0) {
            addPlaceholders(tablePileElement, 1);
            tablePileElement.style.minHeight = '100px';
        } else {
            const numCards = tablePile.length;
            const cardsToRender = Math.min(numCards, MAX_VISIBLE_STACK_CARDS);
            const startIndex = numCards - cardsToRender;

            let cardHeight = 90;
            const sampleCard = document.querySelector('#player-hand .card') || document.querySelector('.card-placeholder');
            if (sampleCard) { cardHeight = sampleCard.offsetHeight || 90; }

            const totalOffsetY = (cardsToRender > 1) ? (cardsToRender - 1) * TABLE_STACK_OFFSET_Y : 0;
            tablePileElement.style.minHeight = `${cardHeight + totalOffsetY + 10}px`;

            for (let i = startIndex; i < numCards; i++) {
                const card = tablePile[i];
                if (!card) { console.warn(`Invalid card at index ${i} in tablePile state`); continue; }

                const cardElement = createCardElement(card, false);
                cardElement.style.position = 'absolute';
                cardElement.style.zIndex = i + 1;

                const offsetIndex = i - startIndex;
                const translateX = offsetIndex * TABLE_STACK_OFFSET_X;
                const translateY = offsetIndex * TABLE_STACK_OFFSET_Y;

                cardElement.style.left = '50%';
                cardElement.style.top = `${translateY}px`;
                cardElement.style.transform = `translateX(calc(-50% + ${translateX}px))`;

                tablePileElement.appendChild(cardElement);
            }
        }
    }

    function updateDeckCount(syncOnly = false) {
        // Find elements reliably within the function scope
        const deckCountElement = document.getElementById('deck-count');
        const deckElement = document.getElementById('deck');

        if (!deckCountElement || !deckElement) {
            console.error("Deck count or deck element not found in updateDeckCount.");
            return;
        }

        // Assume 'deck' array is accessible in the outer scope
        if (typeof deck === 'undefined') {
             console.error("Deck array not accessible in updateDeckCount.");
             deckCountElement.textContent = '?'; // Indicate error
             deckElement.style.display = 'none';
             return;
        }

        const count = deck.length;
        // console.log(`updateDeckCount called. Deck length: ${count}, syncOnly: ${syncOnly}`);
        deckCountElement.textContent = count;
        deckElement.style.display = count === 0 ? 'none' : 'block';

        // We don't trigger the animation directly here anymore,
        // unless you specifically want a flash effect on manual syncs.
        // if (syncOnly) { /* maybe add a quick flash? */ }
    }

    function updateTakenCounts() {
        playerTakenCountElement.textContent = playerTakenCards.length;
        computerTakenCountElement.textContent = computerTakenCards.length;
        const pBankaCount = Math.max(0, netBankaDifference);
        const cBankaCount = Math.max(0, -netBankaDifference);
        playerBanksCountElement.textContent = pBankaCount;
        computerBanksCountElement.textContent = cBankaCount;
    }

    function enableDisablePlayerCards() {
        const playerCards = playerHandElement.querySelectorAll('.card:not(.card-back):not(.card-placeholder)');
        const canPlayerInteract = isPlayerTurn && gameInProgress && !turnInProgress;

        playerCards.forEach(cardElement => {
            cardElement.removeEventListener('click', handlePlayerCardClick);
            const cardId = cardElement.dataset.id;
            const cardInHand = playerHand.find(c => c && c.id === cardId);

            if (canPlayerInteract && cardInHand) {
                cardElement.classList.remove('disabled');
                cardElement.style.cursor = 'pointer';
                cardElement.addEventListener('click', handlePlayerCardClick);
            } else {
                cardElement.classList.add('disabled');
                cardElement.style.cursor = 'default';
            }
        });
        playerHandElement.querySelectorAll('.card-placeholder').forEach(p => {
             p.style.cursor = 'default';
             p.classList.add('disabled');
        });
    }

    // --- Player Interaction ---
    async function handlePlayerCardClick(event) {
        console.log("--- Player Clicked Card ---");
        if (!isPlayerTurn || !gameInProgress || turnInProgress) {
            console.log(`Ignoring click: Player Interaction Blocked (isPlayerTurn=${isPlayerTurn}, gameInProgress=${gameInProgress}, turnInProgress=${turnInProgress})`);
            return;
        }
        const cardElement = event.currentTarget;
        if (cardElement.classList.contains('disabled')) {
            console.log("Ignoring click: Card is visually disabled."); return;
        }

        turnInProgress = true;
        enableDisablePlayerCards();

        const cardId = cardElement.dataset.id;
        const cardIndex = playerHand.findIndex(card => card && card.id === cardId);

        if (cardIndex === -1) {
            console.error("Clicked card not found in playerHand state array:", cardId);
            turnInProgress = false;
            enableDisablePlayerCards();
            return;
        }

        const playedCard = playerHand.splice(cardIndex, 1)[0];
        if (!playedCard) {
             console.error("Spliced card is undefined!", cardId);
             turnInProgress = false; enableDisablePlayerCards(); return;
        }
        console.log("Player selected:", playedCard.id);

        const handCardPos = getElementPosition(cardElement);
        const tempPlayedCardElement = createCardElement(playedCard, false);

        const tempRect = tempPlayedCardElement.getBoundingClientRect();
        const tempW = tempRect.width > 0 ? tempRect.width : 60;
        const tempH = tempRect.height > 0 ? tempRect.height : 90;
        tempPlayedCardElement.style.position = 'fixed';
        tempPlayedCardElement.style.left = `${handCardPos.x - tempW / 2}px`;
        tempPlayedCardElement.style.top = `${handCardPos.y - tempH / 2}px`;
        tempPlayedCardElement.style.zIndex = 1000;
        document.body.appendChild(tempPlayedCardElement);

        renderHand(playerHand, playerHandElement, false);

        await animateCardMove(null, tablePileElement, {
            cardElementToAnimate: tempPlayedCardElement,
            duration: DEAL_ANIMATION_DURATION_MS / 1.5,
            startPosOverride: handCardPos
        });

        playCard(playedCard, PLAYER);
    }

    // --- Gameplay Flow ---
    async function playCard(playedCard, playerType) {
        console.log(`--- ${playerType} Playing Card: ${playedCard?.id || 'undefined'} ---`);
        if (!playedCard) {
            console.error("playCard called with undefined card!");
            turnInProgress = false;
            processNextStep(playerType);
            return;
        }

        const topTableCard = tablePile.length > 0 ? tablePile[tablePile.length - 1] : null;
        const cardName = `${getCardDisplayName(playedCard.rank)} ${getSuitSymbol(playedCard.suit)}`;

        const canTake = topTableCard && (playedCard.rank === topTableCard.rank || playedCard.rank === 'J');
        const isPotentialBanka = canTake && topTableCard && tablePile.length === 1 && playedCard.rank === topTableCard.rank;

        let willTake = false;

        if (canTake) {
            // *** CHANGE: Automatic take for both player and computer ***
            willTake = true;
            console.log(`${playerType} card ${playedCard.rank} can take top card ${topTableCard?.rank}. Taking automatically.`);
        } else {
            willTake = false;
        }

        if (willTake) {
            // --- Taking the Pile ---
            const actualIsBanka = isPotentialBanka; // Simplified Banka check
            const pileSize = tablePile.length + 1;
            const message = actualIsBanka
                ? `${playerType === PLAYER ? 'Ti si uzeo/la' : 'Kompjuter je uzeo'} BANKU!`
                : `${playerType === PLAYER ? 'Ti si uzeo/la' : 'Kompjuter je uzeo'} hrpu (${pileSize} ${pileSize === 1 ? 'kartu' : 'karata'}).`;
            console.log(`${playerType} taking pile... (Banka: ${actualIsBanka}) Card: ${cardName}, Pile Size Before Take: ${tablePile.length}`);
            messageArea.textContent = message;

            let tempComputerPlayedCardElement = null;
            // If computer takes, briefly show the card it played on top of the pile
            if (playerType === COMPUTER) {
                tempComputerPlayedCardElement = createCardElement(playedCard, false);
                tempComputerPlayedCardElement.classList.add('computer-played-card-overlay');
                tempComputerPlayedCardElement.style.position = 'absolute';

                const visibleStackSize = Math.min(tablePile.length, MAX_VISIBLE_STACK_CARDS);
                const topOffset = (visibleStackSize > 0 ? (visibleStackSize - 1) : 0) * TABLE_STACK_OFFSET_Y;
                const topOffsetX = (visibleStackSize > 0 ? (visibleStackSize - 1) : 0) * TABLE_STACK_OFFSET_X;
                tempComputerPlayedCardElement.style.left = '50%';
                tempComputerPlayedCardElement.style.top = `${topOffset}px`;
                tempComputerPlayedCardElement.style.transform = `translateX(calc(-50% + ${topOffsetX}px))`;
                tempComputerPlayedCardElement.style.zIndex = (tablePile.length || 0) + 50;
                tablePileElement.appendChild(tempComputerPlayedCardElement);

                console.log("Computer showing card overlay before taking...");
                await new Promise(resolve => setTimeout(resolve, COMPUTER_SHOW_CARD_DELAY_MS)); // Wait briefly
            }

            // *** CHANGE: Removed pile take animation ***
            console.log(`${playerType} take - skipping animation.`);

            // Update logical state immediately
            takePile(playerType, playedCard, actualIsBanka);

             // Remove computer overlay card if it exists
            if (tempComputerPlayedCardElement && tempComputerPlayedCardElement.parentNode) {
                 tempComputerPlayedCardElement.parentNode.removeChild(tempComputerPlayedCardElement);
             }

            // Clear the table pile DOM immediately
            tablePileElement.innerHTML = ''; addPlaceholders(tablePileElement, 1);
            renderTablePile(); // Show empty placeholder state

            // Update counts
            updateTakenCounts();

            processNextStep(playerType); // Move to the next step in the game

        } else {
            // --- Not Taking - Just Adding Card to Pile ---
            console.log(`${playerType} adding card ${playedCard.id} to pile (Rank: ${playedCard.rank}).`);
            tablePile.push(playedCard);
            renderTablePile();
            messageArea.textContent = `${playerType === PLAYER ? 'Ti si odigrao/la' : 'Kompjuter je odigrao'} ${cardName}.`;

            setTimeout(() => processNextStep(playerType), NEXT_TURN_DELAY);
        }
        console.log(`--- ${playerType} Play Card End ---`);
    }

    // Updates the logical state when a pile is taken
    function takePile(playerType, playedCard, isBanka) {
        console.log(`takePile state update: ${playerType}. Banka reported: ${isBanka}`);

        // *** PROMIJENJENO: Logovanje Banka događaja umjesto flag-a ***
        if (isBanka) {
            let bankaPlayedCardId = playedCard?.id;
            let bankaTableCardId = (tablePile.length === 1 && tablePile[0]) ? tablePile[0].id : null;

            if (bankaPlayedCardId && bankaTableCardId) {
                const bankaEvent = {
                    playerType: playerType,
                    playedCardId: bankaPlayedCardId,
                    tableCardId: bankaTableCardId
                };
                bankaEventsLog.push(bankaEvent);
                console.log(`%cBANKA EVENT Recorded: By ${playerType}, Cards: ${bankaPlayedCardId}, ${bankaTableCardId}. Log size: ${bankaEventsLog.length}`, 'color: gold; font-weight: bold;');
                // netBankaDifference se i dalje ažurira za bodovanje
                if (playerType === PLAYER) netBankaDifference++;
                else netBankaDifference--;
            } else {
                 console.warn(`%cBanka reported for ${playerType}, but card IDs missing! Played: ${bankaPlayedCardId}, Table: ${bankaTableCardId}. Event NOT logged.`, 'color: orange;');
                 // Ipak ažuriraj netBankaDifference ako je Banka prijavljena, čak i ako ID fali (za bodove)
                 if (playerType === PLAYER) netBankaDifference++;
                 else netBankaDifference--;
            }
        }

        const takenCards = [playedCard, ...tablePile].filter(card => card != null);
        tablePile = []; // Clear the logical table pile

        lastTaker = playerType;

        if (playerType === PLAYER) {
            playerTakenCards.push(...takenCards);
            // netBankaDifference se sada ažurira gore u if(isBanka) bloku
        } else { // COMPUTER
            computerTakenCards.push(...takenCards);
             // netBankaDifference se sada ažurira gore u if(isBanka) bloku
        }
        console.log(`Pile taken by ${playerType}. Player taken: ${playerTakenCards.length}, Computer taken: ${computerTakenCards.length}, Net Banka Diff for score: ${netBankaDifference}`);
    }

    // --- Computer Turn Logic ---
    function computerTurn() {
        console.log("--- Computer Turn Start ---");
        if (isPlayerTurn || !gameInProgress) {
             console.log("Computer turn skipped (Not computer's turn or game not in progress).");
             turnInProgress = false;
             if (isPlayerTurn) enableDisablePlayerCards();
             return;
        }
        if (computerHand.length === 0) {
             console.log("Computer has no cards to play.");
             turnInProgress = false;
             processNextStep(COMPUTER);
             return;
        }

        messageArea.textContent = "Kompjuter razmišlja...";
        enableDisablePlayerCards();

        const delay = COMPUTER_TURN_DELAY_MIN + Math.random() * (COMPUTER_TURN_DELAY_MAX - COMPUTER_TURN_DELAY_MIN);
        console.log(`Computer thinking for ${delay.toFixed(0)}ms.`);

        setTimeout(async () => {
            turnInProgress = true;

            if (isPlayerTurn || !gameInProgress || computerHand.length === 0) {
                 console.log(`Computer turn aborted after delay: State changed (isPlayerTurn=${isPlayerTurn}, gameInProgress=${gameInProgress}, handEmpty=${computerHand.length === 0}).`);
                 turnInProgress = false;
                 if (isPlayerTurn) enableDisablePlayerCards();
                 return;
            }

            console.log("--- Computer AI Logic Start ---");
            const topTableCard = tablePile.length > 0 ? tablePile[tablePile.length - 1] : null;
            let cardToPlayIndex = -1;
            let bestPlayReason = "N/A";

            // AI Strategy (same as before)
            if (topTableCard && tablePile.length === 1) {
                const bankaIndex = computerHand.findIndex(c => c && c.rank === topTableCard.rank);
                if (bankaIndex !== -1) { cardToPlayIndex = bankaIndex; bestPlayReason = "Take Banka"; }
            }
            if (cardToPlayIndex === -1 && topTableCard) {
                const matchRankIndex = computerHand.findIndex(c => c && c.rank === topTableCard.rank);
                if (matchRankIndex !== -1) { cardToPlayIndex = matchRankIndex; bestPlayReason = "Take with Same Rank"; }
            }
            if (cardToPlayIndex === -1 && topTableCard) {
                 const jackIndex = computerHand.findIndex(c => c && c.rank === 'J');
                 if (jackIndex !== -1) { cardToPlayIndex = jackIndex; bestPlayReason = "Take with Jack"; }
            }
            if (cardToPlayIndex === -1) {
                bestPlayReason = "Discard";
                let discardIndex = computerHand.findIndex(c => c && c.points === 0 && c.rank !== 'J');
                if (discardIndex === -1) {
                     discardIndex = computerHand.findIndex(c => c && c.points > 0 && c.rank !== 'J');
                     if (discardIndex !== -1) bestPlayReason += " (Point Card)";
                }
                if (discardIndex === -1) {
                     discardIndex = computerHand.findIndex(c => c && c.rank === 'J');
                     if (discardIndex !== -1) bestPlayReason += " (Forced Jack)";
                }
                if (discardIndex === -1 && computerHand.length > 0) {
                     discardIndex = 0; bestPlayReason += " (Forced First Card)";
                } else if (computerHand.length === 0) {
                    console.error("AI discard logic reached with empty hand!");
                    turnInProgress = false; processNextStep(COMPUTER); return;
                }
                 cardToPlayIndex = discardIndex;
            }
            console.log(`AI Decision: ${bestPlayReason}. Card Index: ${cardToPlayIndex}. Hand Size: ${computerHand.length}`);

            if (cardToPlayIndex === -1 || cardToPlayIndex >= computerHand.length || !computerHand[cardToPlayIndex]) {
                 console.error(`AI Error: Invalid card index chosen (${cardToPlayIndex}). Hand:`, computerHand);
                 messageArea.textContent = "Greška u logici kompjutera.";
                 turnInProgress = false;
                 processNextStep(COMPUTER);
                 return;
            }

            const playedCard = computerHand.splice(cardToPlayIndex, 1)[0];
            if (!playedCard) {
                 console.error(`AI Error: Spliced card is undefined at index ${cardToPlayIndex}`);
                 turnInProgress = false; processNextStep(COMPUTER); return;
            }
            console.log(`Computer playing: ${playedCard.id}`);

            const computerHandChildren = computerHandElement.children;
            const slotElement = computerHandChildren[cardToPlayIndex] || computerHandElement;
            const startPos = getElementPosition(slotElement);

            const tempCardElement = createCardElement(playedCard, false);
            const tempRect = tempCardElement.getBoundingClientRect();
            const tempW = tempRect.width > 0 ? tempRect.width : 60;
            const tempH = tempRect.height > 0 ? tempRect.height : 90;
            tempCardElement.style.position = 'fixed';
            tempCardElement.style.left = `${startPos.x - tempW / 2}px`;
            tempCardElement.style.top = `${startPos.y - tempH / 2}px`;
            tempCardElement.style.zIndex = 1000;
            document.body.appendChild(tempCardElement);

            renderHand(computerHand, computerHandElement, true);

            await animateCardMove(null, tablePileElement, {
                cardElementToAnimate: tempCardElement,
                duration: DEAL_ANIMATION_DURATION_MS / 1.5,
                startPosOverride: startPos
            });

            playCard(playedCard, COMPUTER);

            console.log("--- Comp AI Logic End ---");

        }, delay);
        console.log("--- Comp Turn Function End (Timeout Scheduled) ---");
    }

    // --- Game State Checks and Transitions ---
    function processNextStep(lastPlayerType) {
        console.log(`Processing next step after ${lastPlayerType}'s turn...`);

        if (!gameInProgress) {
            console.log("-> Game stopped. No next step processing.");
            turnInProgress = false;
            return;
        }

        if (playerHand.length === 0 && computerHand.length === 0) {
            console.log("-> Both hands empty.");
            if (deck.length > 0) {
                console.log("--> Deck has cards. Scheduling redeal.");
                messageArea.textContent = "Ruke prazne. Dijelim ponovo...";
                enableDisablePlayerCards();
                setTimeout(() => {
                    turnInProgress = true;
                    redealHands();
                }, MESSAGE_DELAY / 2);
            } else {
                console.log("--> Deck empty. Scheduling end of round.");
                gameInProgress = false;
                isPlayerTurn = false;
                turnInProgress = false;
                enableDisablePlayerCards();
                messageArea.textContent = "Sve karte odigrane! Brojanje bodova...";
                setTimeout(endRound, MESSAGE_DELAY);
            }
            return;
        }

        const nextPlayerType = (lastPlayerType === PLAYER) ? COMPUTER : PLAYER;
        isPlayerTurn = (nextPlayerType === PLAYER);
        console.log(`--> Game continues. Next turn: ${nextPlayerType}.`);

        if (!isPlayerTurn) {
            if (computerHand.length > 0) {
                messageArea.textContent = "Kompjuter igra...";
                enableDisablePlayerCards();
                computerTurn();
            } else {
                console.warn("Computer's turn but hand is unexpectedly empty. Re-checking state.");
                turnInProgress = false;
                processNextStep(COMPUTER);
            }
        } else {
            if (playerHand.length > 0) {
                messageArea.textContent = "Tvoj je red.";
                turnInProgress = false;
                enableDisablePlayerCards();
            } else {
                console.warn("Player's turn but hand is unexpectedly empty. Re-checking state.");
                turnInProgress = false;
                processNextStep(PLAYER);
            }
        }
        console.log("--- processNextStep End ---");
    }

    // --- Redeal Hands (with animation) ---
    async function redealHands() {
        console.log("--- Redealing Hands ---");

        // Find elements needed within this function scope
        const messageArea = document.getElementById('message-area');
        const playerHandElement = document.getElementById('player-hand');
        const computerHandElement = document.getElementById('computer-hand');

        // Basic checks
        if (!messageArea || !playerHandElement || !computerHandElement) {
            console.error("One or more essential elements not found in redealHands.");
            return; // Stop execution if elements are missing
        }
        if (typeof deck === 'undefined' || deck.length === 0) {
            console.log("Redeal called but deck is now empty. Ending round instead.");
            gameInProgress = false; turnInProgress = false;
            endRound(); // Proceed to end the round
            return;
        }

        messageArea.textContent = "Dijelim nove karte...";
        turnInProgress = true; // Block interactions during redeal
        enableDisablePlayerCards(); // Disable cards visually

        // *** Ensure count is synced before starting redeal decrements ***
        updateDeckCount(true); // Sync display before starting new decrements

        const dealPromises = [];
        let currentDealDelay = 0; // Reset delay for this dealing sequence
        // Calculate how many cards to deal (can't deal more than available)
        const cardsToDealTotal = deck.length;
        const cardsToDealEach = Math.min(MAX_HAND_SIZE, Math.floor(cardsToDealTotal / 2));
        console.log(`Redealing ${cardsToDealEach} cards to each player. Deck size before: ${deck.length}`);

        const tempPlayerHand = [];
        const tempComputerHand = [];

        // Clear and prepare hand areas
        playerHandElement.innerHTML = ''; addPlaceholders(playerHandElement, MAX_HAND_SIZE);
        computerHandElement.innerHTML = ''; addPlaceholders(computerHandElement, MAX_HAND_SIZE);

        // Deal cards alternately
        for (let i = 0; i < cardsToDealEach; i++) {
            // Player card
            if (deck.length > 0) {
                const playerCard = deck.pop();
                // *** Schedule the count decrement ***
                scheduleCountDecrement(currentDealDelay);
                tempPlayerHand.push(playerCard);
                const playerSlotIndex = i;
                // --- Player Animation & UI Update ---
                const playerAnimPromise = new Promise(r => setTimeout(r, currentDealDelay))
                    .then(() => animateCardMove(playerCard, playerHandElement, { targetSlotIndex: playerSlotIndex }));
                playerAnimPromise.then(() => {
                    const placeholder = playerHandElement.children[playerSlotIndex];
                    if (placeholder && placeholder.classList.contains('card-placeholder')) {
                        playerHandElement.replaceChild(createCardElement(playerCard, false), placeholder);
                    }
                });
                dealPromises.push(playerAnimPromise);
                currentDealDelay += DEAL_DELAY_MS;
            }

            // Computer card
            if (deck.length > 0) {
                const computerCard = deck.pop();
                // *** Schedule the count decrement ***
                scheduleCountDecrement(currentDealDelay);
                tempComputerHand.push(computerCard);
                const computerSlotIndex = i;
                // --- Computer Animation & UI Update ---
                const compAnimPromise = new Promise(r => setTimeout(r, currentDealDelay))
                    .then(() => animateCardMove(computerCard, computerHandElement, { isHidden: true, targetSlotIndex: computerSlotIndex }));
                compAnimPromise.then(() => {
                    const placeholder = computerHandElement.children[computerSlotIndex];
                    if (placeholder && placeholder.classList.contains('card-placeholder')) {
                        computerHandElement.replaceChild(createCardElement(computerCard, true), placeholder);
                    }
                });
                dealPromises.push(compAnimPromise);
                currentDealDelay += DEAL_DELAY_MS;
            }
        }

        // Handle odd card (if deck had an odd number initially)
        if (deck.length === 1) {
            console.log("Dealing last odd card from deck to player.");
            const lastCard = deck.pop();
            // *** Schedule the count decrement for the last card ***
            scheduleCountDecrement(currentDealDelay);
            tempPlayerHand.push(lastCard);
            const playerSlotIndex = cardsToDealEach; // Put it in the next available slot
            // --- Animation & UI Update for the last card ---
            const playerAnimPromise = new Promise(r => setTimeout(r, currentDealDelay))
                .then(() => animateCardMove(lastCard, playerHandElement, { targetSlotIndex: playerSlotIndex }));
            playerAnimPromise.then(() => {
                const placeholder = playerHandElement.children[playerSlotIndex];
                if (placeholder && placeholder.classList.contains('card-placeholder')) {
                    playerHandElement.replaceChild(createCardElement(lastCard, false), placeholder);
                }
            });
            dealPromises.push(playerAnimPromise);
            // Don't increment currentDealDelay here as it's the absolute last action in the loop part
        }

        // Wait for all redeal animations
        await Promise.all(dealPromises);
        console.log("All redeal animations complete. Deck size after: " + deck.length);

        // *** Final sync after all animations/decrements should be done ***
        const syncDelay = currentDealDelay + 100; // Wait slightly longer than the last schedule
        setTimeout(() => {
            console.log("Final deck count sync after redeal.");
            updateDeckCount(true); // Sync display with actual deck.length
        }, syncDelay);

        // Update the actual game state arrays
        playerHand = [...tempPlayerHand];
        computerHand = [...tempComputerHand];

        // Determine next turn (usually player after redeal, adjust if needed)
        // Use a timeout slightly longer than the sync timeout
        const nextTurnDelay = syncDelay + 150;
        setTimeout(() => {
            isPlayerTurn = true; // Or determine based on game rules if applicable
            messageArea.textContent = "Nove karte podijeljene. Tvoj je red.";
            turnInProgress = false; // Allow interaction again
            enableDisablePlayerCards(); // Enable player cards
            console.log("--- Redeal Complete - Player's Turn ---");
        }, nextTurnDelay);
    }

    // --- End Round / Scoring ---
    function endRound() {
        console.log("--- Ending Round ---");
        gameInProgress = false; isPlayerTurn = false; turnInProgress = false;
        enableDisablePlayerCards();

        if (lastTaker && tablePile.length > 0) {
             console.log(`Assigning remaining ${tablePile.length} cards from table to last taker: ${lastTaker}`);
             const remainingCards = [...tablePile];
             const takerName = lastTaker === PLAYER ? 'Igrač' : 'Kompjuter';
             messageArea.textContent = `${takerName} uzima preostale karte sa stola (${remainingCards.length})...`;

             // *** CHANGE: Removed end-of-round take animation ***
             console.log("End-of-round take - skipping animation.");

             // Add cards to the correct logical pile immediately
             if (lastTaker === PLAYER) { playerTakenCards.push(...remainingCards); }
             else { computerTakenCards.push(...remainingCards); }
             tablePile = []; // Clear logical table pile

             // Clear table visually immediately
             tablePileElement.innerHTML = ''; addPlaceholders(tablePileElement, 1);
             renderTablePile();

             // Update counts and proceed to scoring
             updateTakenCounts();
             proceedToScoring();

        } else {
             if (tablePile.length > 0) {
                 console.warn(`Cards left (${tablePile.length}) on table, but no recorded last taker. Discarding.`);
                 messageArea.textContent = `Preostale karte (${tablePile.length}) na stolu se odbacuju.`;
                 tablePile = [];
                 renderTablePile();
                 updateTakenCounts();
                 setTimeout(proceedToScoring, MESSAGE_DELAY / 2);
             } else {
                 console.log("No cards left on table. Proceeding directly to scoring.");
                 proceedToScoring();
             }
        }
    }

    // Funkcija koja obrađuje log Banka događaja i vraća ID-jeve karata za isticanje
    function determineFinalHighlightableBankas(log) {
        let playerBankaStack = []; // Stack za igračeva Banka događanja
        let computerBankaStack = []; // Stack za kompjuterska Banka događanja

        console.log("Processing Banka Event Log:", log);

        // Prolazimo kroz log i simuliramo poništavanje
        for (const event of log) {
            if (event.playerType === PLAYER) {
                // Igrač je napravio Banku
                if (computerBankaStack.length > 0) {
                    // Kompjuter ima Banku na stack-u, poništavamo je
                    computerBankaStack.pop();
                    console.log(`   -> Player Banka cancels last Computer Banka. Computer stack size: ${computerBankaStack.length}`);
                } else {
                    // Nema protivničke Banke za poništiti, dodajemo na igračev stack
                    playerBankaStack.push(event);
                     console.log(`   -> Player Banka added to stack. Player stack size: ${playerBankaStack.length}`);
                }
            } else { // COMPUTER made Banka
                // Kompjuter je napravio Banku
                if (playerBankaStack.length > 0) {
                    // Igrač ima Banku na stack-u, poništavamo je
                    playerBankaStack.pop();
                    console.log(`   -> Computer Banka cancels last Player Banka. Player stack size: ${playerBankaStack.length}`);
                } else {
                    // Nema protivničke Banke za poništiti, dodajemo na kompjuterski stack
                    computerBankaStack.push(event);
                    console.log(`   -> Computer Banka added to stack. Computer stack size: ${computerBankaStack.length}`);
                }
            }
        }

        // Sakupljamo ID-jeve karata iz preostalih (neponištenih) Banki
        let finalHighlightIds = new Set();
        playerBankaStack.forEach(b => {
            if (b.playedCardId) finalHighlightIds.add(b.playedCardId);
            if (b.tableCardId) finalHighlightIds.add(b.tableCardId);
        });
        computerBankaStack.forEach(b => {
             if (b.playedCardId) finalHighlightIds.add(b.playedCardId);
             if (b.tableCardId) finalHighlightIds.add(b.tableCardId);
        });

        console.log("Final Banka Stacks - Player:", playerBankaStack, "Computer:", computerBankaStack);
        console.log("Final Highlightable Card IDs:", finalHighlightIds);
        return finalHighlightIds;
    }

    function proceedToScoring() {
        console.log("Proceeding to scoring calculation...");
        // Provjera da li je igra završena i rezultati još nisu prikazani
        if(resultsScreen.classList.contains('hidden') && !gameContainer.classList.contains('hidden')) {
            messageArea.textContent = "Brojanje bodova...";
            const scores = calculateScores(); // Izračunaj bodove (koristi netBankaDifference)

            // *** ODREDI KOJE KARTE ISTAKNUTI NA OSNOVU PONIŠTAVANJA ***
            const highlightIds = determineFinalHighlightableBankas(bankaEventsLog);
            console.log("Final Scores Calculated:", scores);

            setTimeout(() => {
                gameContainer.classList.add('hidden');
                resultsScreen.classList.remove('hidden');
                // *** PROSLIJEDI ID-jeve ZA ISTICANJE FUNKCIJI ZA PRIKAZ ***
                displayFullPageResults(scores, highlightIds);
                restartButton.style.display = 'none';
                console.log("--- End Round Complete - Results Displayed ---");
            }, 500); // Malo kašnjenje da se poruka vidi
        } else {
             console.log("Scoring already processed or results screen already visible.");
        }
    }

    function calculateScores() {
        console.log("Calculating scores...");
        let playerScores = { cardPoints: 0, mostCardsPoints: 0, bankaPoints: 0, total: 0 };
        let computerScores = { cardPoints: 0, mostCardsPoints: 0, bankaPoints: 0, total: 0 };

        playerScores.cardPoints = playerTakenCards.reduce((sum, card) => sum + (card?.points ?? 0), 0);
        computerScores.cardPoints = computerTakenCards.reduce((sum, card) => sum + (card?.points ?? 0), 0);
        console.log(`Card Points - Player: ${playerScores.cardPoints}, Computer: ${computerScores.cardPoints}`);
        const totalCardPoints = playerScores.cardPoints + computerScores.cardPoints;
        if (totalCardPoints !== 21) {
             console.warn(`Total card points calculated (${totalCardPoints}) do not match expected 21! Check logic or card data.`);
        }

        const playerCount = playerTakenCards.length;
        const computerCount = computerTakenCards.length;
        console.log(`Card Count - Player: ${playerCount}, Computer: ${computerCount}`);
        if (playerCount + computerCount !== 52) {
             console.warn(`Total cards taken (${playerCount + computerCount}) do not match 52! Check card assignment logic.`);
        }
        if (playerCount > computerCount) {
            playerScores.mostCardsPoints = MOST_CARDS_POINTS;
            console.log(`Player gets ${MOST_CARDS_POINTS} points for most cards.`);
        } else if (computerCount > playerCount) {
            computerScores.mostCardsPoints = MOST_CARDS_POINTS;
            console.log(`Computer gets ${MOST_CARDS_POINTS} points for most cards.`);
        } else {
            console.log("Most cards tied - no points awarded.");
        }

        if (netBankaDifference > 0) {
            playerScores.bankaPoints = netBankaDifference * BANKA_POINTS;
        } else if (netBankaDifference < 0) {
            computerScores.bankaPoints = Math.abs(netBankaDifference) * BANKA_POINTS;
        }
        console.log(`Banka Points - Player: ${playerScores.bankaPoints}, Computer: ${computerScores.bankaPoints} (Based on Net Diff: ${netBankaDifference})`);

        playerScores.total = playerScores.cardPoints + playerScores.mostCardsPoints + playerScores.bankaPoints;
        computerScores.total = computerScores.cardPoints + computerScores.mostCardsPoints + computerScores.bankaPoints;
        console.log(`Total Score - Player: ${playerScores.total}, Computer: ${computerScores.total}`);

        return { player: playerScores, computer: computerScores };
    }

    function displayFullPageResults(scores, highlightableCardIds) {
        console.log("Displaying results on results screen. Highlight IDs:", highlightableCardIds);
        document.getElementById('results-player-card-points').textContent = scores.player.cardPoints;
        document.getElementById('results-player-most-cards-points').textContent = scores.player.mostCardsPoints;
        document.getElementById('results-player-banka-points').textContent = scores.player.bankaPoints;
        document.getElementById('results-player-total-score').textContent = scores.player.total;
        document.getElementById('results-computer-card-points').textContent = scores.computer.cardPoints;
        document.getElementById('results-computer-most-cards-points').textContent = scores.computer.mostCardsPoints;
        document.getElementById('results-computer-banka-points').textContent = scores.computer.bankaPoints;
        document.getElementById('results-computer-total-score').textContent = scores.computer.total;

        let winnerMessage = "";
        if (scores.player.total > scores.computer.total) {
            winnerMessage = "Čestitamo, pobijedio/la si!";
        } else if (scores.computer.total > scores.player.total) {
            winnerMessage = "Kompjuter je pobijedio.";
        } else {
            winnerMessage = "Neriješeno je!";
        }
        document.getElementById('results-winner-message').textContent = winnerMessage;

        const sortCards = (a, b) => {
             const suitOrder = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
             if (suitOrder !== 0) return suitOrder;
             return (CARD_VALUES[a.rank] || 0) - (CARD_VALUES[b.rank] || 0);
        };

        playerResultsCardsContainer.innerHTML = '';
        playerTakenCards.sort(sortCards).forEach(card => {
            if(card && card.id) { // Dodata provjera za card.id
                const cardElement = createCardElement(card, false);
                // *** PROMIJENJENA PROVJERA ZA ISTICANJE ***
                if (highlightableCardIds.has(card.id)) {
                    cardElement.classList.add('banka-highlight');
                     console.log(`Highlighting Player card: ${card.id}`);
                }
                playerResultsCardsContainer.appendChild(cardElement);
            } else {
                console.warn("Null card or card without ID found in playerTakenCards during results display", card);
            }
        });

        computerResultsCardsContainer.innerHTML = '';
        computerTakenCards.sort(sortCards).forEach(card => {
             if(card && card.id) { // Dodata provjera za card.id
                const cardElement = createCardElement(card, false);
                 // *** PROMIJENJENA PROVJERA ZA ISTICANJE ***
                if (highlightableCardIds.has(card.id)) {
                    cardElement.classList.add('banka-highlight');
                     console.log(`Highlighting Computer card: ${card.id}`);
                }
                computerResultsCardsContainer.appendChild(cardElement);
            } else {
                 console.warn("Null card or card without ID found in computerTakenCards during results display", card);
            }
        });
    }

    // --- Utility Functions ---
    function getCardDisplayName(rank) {
        switch(rank){
            case 'J': return 'Žandar'; case 'Q': return 'Dama'; case 'K': return 'Kralj'; case 'A': return 'As';
            default: return rank;
        }
    }
    function getSuitSymbol(suit) {
        switch(suit){
            case 'hearts': return '♥'; case 'diamonds': return '♦'; case 'clubs': return '♣'; case 'spades': return '♠';
            default: return '';
        }
    }

    // --- Event Listeners Setup ---
    startButton.addEventListener('click', startGame);
    if (toggleRulesButton && rulesContainer) {
        toggleRulesButton.addEventListener('click', () => {
            const isHidden = rulesContainer.classList.contains('hidden');
            rulesContainer.classList.toggle('hidden');
            toggleRulesButton.textContent = isHidden ? 'Sakrij Pravila' : 'Prikaži Pravila';
            if (!isHidden) rulesContainer.scrollTop = 0;
        });
    } else { console.error("Rules button or container element not found!"); }
    restartButton.addEventListener('click', setupForNewGame);
    newGameButton.addEventListener('click', setupForNewGame);

    // --- Initial Setup ---
    resetToInitialState();
    console.log("Prišpil Game Initialized and Ready.");

}); // End DOMContentLoaded wrapper
