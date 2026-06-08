#include <iostream>
#include <cstdlib>
#include <cmath>
#include <cstring>
#include "ToD.hpp"
#include "../shared/terminal_input.hpp"

#if defined(_WIN32)
static void clear_screen_local() { termio::clearScreen(); }
#else
static void clear_screen_local() { system("clear"); }
#endif

static void wait_for_start_or_escape() {
    while (1) {
        termio::Key k = termio::readKeyNonBlocking();
        if (k == termio::Key::Escape) return;
        if (k == termio::Key::Enter || k == termio::Key::F) return;
        if (k == termio::Key::W || k == termio::Key::A || k == termio::Key::S || k == termio::Key::D) return;
        if (k == termio::Key::Up || k == termio::Key::Down || k == termio::Key::Left || k == termio::Key::Right) return;
        termio::sleepMs(10);
    }
}

static bool show_start_screen_torment() {
    clear_screen_local();
    termio::enableAnsi();
    termio::hideCursor(true);

    cout << "\033[1;35m";
    cout << "========================================\n";
    cout << "                TORMENT                 \n";
    cout << "========================================\n";
    cout << "\033[0m\n";

    cout << "A shifting labyrinth. A key. A blade.\n";
    cout << "And dragons that never stop hunting.\n\n";

    cout << "Goal:\n";
    cout << "  - Find the \033[1;33mKey (K)\033[0m\n";
    cout << "  - Find the \033[1;36mSword (S)\033[0m\n";
    cout << "  - Slay every dragon\n";
    cout << "  - Escape through \033[1mE\033[0m\n\n";

    cout << "Rules:\n";
    cout << "  - Without the sword: stay away from dragons or you die.\n";
    cout << "  - With the sword: confront dragons to kill them.\n";
    cout << "  - You can only leave if you have the key and no dragons remain.\n\n";

    cout << "Controls:\n";
    cout << "  - Move: WASD or Arrow Keys\n";
    cout << "  - Quit: ESC\n\n";

    cout << "Press any movement key (or Enter) to begin...\n";

    wait_for_start_or_escape();
    termio::Key k = termio::readKeyNonBlocking();
    if (k == termio::Key::Escape) { termio::hideCursor(false); return false; }
    clear_screen_local();
    return true;
}

static void show_end_screen_torment(int status) {
    clear_screen_local();
    termio::enableAnsi();
    termio::hideCursor(true);

    if (status == 1) {
        cout << "\033[1;32m";
        cout << "========================================\n";
        cout << "                 VICTORY                \n";
        cout << "========================================\n";
        cout << "\033[0m\n";
        cout << "The labyrinth yields. The exit opens.\n";
        cout << "You walk away, bloodied but unbroken.\n\n";
    } else {
        cout << "\033[1;31m";
        cout << "========================================\n";
        cout << "                  DEFEAT                \n";
        cout << "========================================\n";
        cout << "\033[0m\n";
        cout << "The hunt ends. The maze claims another soul.\n\n";
    }

    cout << "Press Enter (or ESC) to exit...\n";
    while (1) {
        termio::Key k = termio::readKeyNonBlocking();
        if (k == termio::Key::Enter || k == termio::Key::Escape) break;
        termio::sleepMs(10);
    }
    termio::hideCursor(false);
}

void cli::gameStart::cycle(logic::Elements& elements) // Starting cycle , ask the user for a number of dragons
{      
    clear_screen_local();
    termio::enableAnsi();
    printf("Welcome to Dragon's Bane!\nPlease insert the number of dragons (1-%d) => ",maxDragons);

    cin >> elements.numDragons;
    while(!(1 <= elements.numDragons && elements.numDragons <= maxDragons))
    {
        cout << "\033[1F" << "\033[2K";
        printf("You can only have 1 to %d Dragons =>  ",maxDragons);
        cin >> elements.numDragons;
    }
    clear_screen_local();
}

void cli::gamePlay::printMap(logic::Game game, logic::Elements element) // Prints the map
{
    clear_screen_local();

    // Prints the map
    for (int i = 0; i < mapSize; i++)
    {
        for (int j = 0; j < mapSize; j++) 
        {
            switch (game.map[i][j])
            {
            case 'X':
                printf("\033[1;32m%c\033[0m",game.map[i][j]);
            break;

            case 'F':
            case 'D':
                printf("\033[1;31m%c\033[0m",game.map[i][j]);
            break;

            case 'H':
            case 'A':
                printf("\033[1;34m%c\033[0m",game.map[i][j]);
            break;

            case 'K':
                printf("\033[1;33m%c\033[0m",game.map[i][j]);
            break;

            case 'S':
                printf("\033[1;36m%c\033[0m",game.map[i][j]);
            break;
            
            default:
                cout << game.map[i][j];
            break;
            }  
            if((i==1) && (j==mapSize-1)) printf("   \033[7mINVENTORY\033[0m");
            if((i==2) && (j==mapSize-1) && element.hero.hasKey) printf("  \033[7m>>Master Key\033[0m");
            if((i==3) && (j==mapSize-1) && element.hero.hasSword) printf("  \033[7m>>DragonKiller\033[0m");
            if((i==(mapSize-1)) && (j==mapSize-1)) printf("   \033[7mDragons Alive %d/%d\033[0m",(element.numDragons-element.killedDragons),element.numDragons);
            cout << " \n"[j == (mapSize-1)];
            
        }     
        
    }
                  
                
                
}

void cli::gamePlay::updateMap(logic::Game& game, logic::Elements elements) // Updates the map of every element new position
{   
    // Updates hero pos
    game.map[elements.hero.pos.i][elements.hero.pos.j] = elements.hero.symbol;

    // Updates key pos
    if(!elements.hero.hasKey) game.map[elements.key.pos.i][elements.key.pos.j] = elements.key.symbol;

    // Updates sword pos
    if(!elements.hero.hasSword) game.map[elements.sword.pos.i][elements.sword.pos.j] = elements.sword.symbol;

    // Updates dragons positions
    for(int i = 0; i < elements.numDragons; i++)
    {
        if(elements.dragons[i].alive) game.map[elements.dragons[i].pos.i][elements.dragons[i].pos.j] = elements.dragons[i].symbol;
    }
}

void cli::gamePlay::cycle(logic::Game& game,logic::Elements elements) // Gameplay cycle
{      
    termio::enableAnsi();
    termio::hideCursor(true);

    elements.placeDragons(game);
    elements.placeExit(game);

    while (1)
    {   
        updateMap(game,elements);
        printMap(game,elements);

        game.map[elements.hero.pos.i][elements.hero.pos.j] = ' ';

        int di = 0, dj = 0;
        while (1) {
            termio::Key k = termio::readKeyNonBlocking();
            if (k == termio::Key::Escape) { termio::hideCursor(false); return; }
            if (termio::keyToDir(k, di, dj)) break;
            termio::sleepMs(10);
        }

        elements.moveHeroDir(game, di, dj);
        game.map[elements.hero.pos.i][elements.hero.pos.j] = elements.hero.symbol;
        if(game.updateGame(elements)) 
        {
            printMap(game,elements);
            termio::hideCursor(false);
            return;
        }
        
        for(int i = 0; i < elements.numDragons; i++) game.map[elements.dragons[i].pos.i][elements.dragons[i].pos.j] = ' ';

        for(int i = 0; i < elements.numDragons; i++)
        {
            if(elements.dragons[i].alive)
            {
                elements.moveDragon(game,i);
                game.map[elements.dragons[i].pos.i][elements.dragons[i].pos.j] =  elements.dragons[i].symbol;
                if(game.updateGame(elements)) 
                {
                    updateMap(game,elements);
                    printMap(game,elements);
                    termio::hideCursor(false);
                    return;
                }
            }
        }  
    }   
}

void logic::Elements::moveHero(logic::Game game) // Moves the hero in a inpured direction
{   
    int di = 0, dj = 0;
    while (1) {
        termio::Key k = termio::readKeyNonBlocking();
        if (termio::keyToDir(k, di, dj)) break;
        termio::sleepMs(10);
    }
    moveHeroDir(game, di, dj);
}

void logic::Elements::moveHeroDir(logic::Game game, int di, int dj)
{
    coordenadas newPos;
    newPos.i = hero.pos.i + di;
    newPos.j = hero.pos.j + dj;

    if (newPos.i < 0 || newPos.i >= mapSize || newPos.j < 0 || newPos.j >= mapSize) return;

    switch (game.map[newPos.i][newPos.j])
    {
    case 'S': // Sword
        hero.hasSword = true;
        hero.symbol = 'A';
        hero.pos = newPos;
    break;

    case 'K': // Key
        hero.hasKey = true;
        hero.pos = newPos;
    break;

    case 'E': // Exit
        if(hero.hasKey && allDragonsDead())
        {
            hero.pos = newPos;
        }
    break;

    case ' ': // Empty space
        hero.pos = newPos;
    break;

    default:
    break;
    }
}

void logic::Elements::moveDragon(logic::Game game, int dragonID) // Moves a dragon randomly
{   
    // Variables
    vector<coordenadas> validMoves;
    checkValidMoves(validMoves,game,dragons[dragonID]);
    if(validMoves.size() == 0) return;
    int validMoveNumb;
    int endCycle = 1;
   
   
    srand(time(NULL));

    while(endCycle)
    {   
        if(validMoves.size() == 1) validMoveNumb = 0;
        else validMoveNumb = rand() % validMoves.size() ;
        
        // Checks if a move is valid if so the cycle ends
        switch (game.map[validMoves[validMoveNumb].i][validMoves[validMoveNumb].j])
        {
        case 'S': // Sword
            dragons[dragonID].symbol = 'F';
            dragons[dragonID].pos = validMoves[validMoveNumb];
            endCycle = 0;
        break;
        
        case 'K': // Key
            dragons[dragonID].symbol = 'F';
            dragons[dragonID].pos = validMoves[validMoveNumb];
            endCycle = 0;
        break;

        case ' ': // Empty space
            dragons[dragonID].symbol = 'D';
            dragons[dragonID].pos = validMoves[validMoveNumb];
            endCycle = 0;
        break;
        
        default:
        break;

        }  
    }
}

int logic::Game::updateGame(logic::Elements& elements) // Updates the game status
{
    // If the the gero is within 1 space of a dragon and that dragon is alive
    for(int i = 0; i < elements.numDragons; i++)
    {
         if(is_close(elements.dragons[i].pos,elements.hero.pos) && elements.dragons[i].alive)
        {   
            // If the hero has the sword he kills the dragon, if not he dies
            if(elements.hero.hasSword) 
            {   
                elements.dragons[i].alive = 0 ;
                elements.killedDragons++;
                map[elements.dragons[i].pos.i][elements.dragons[i].pos.j] = ' ';
            }
            else gameStatus = -1; // Game lost

            return gameStatus; // Returns game status (if the hero just killed the dragon, or died, he can't be in the exit)
        }   

    }
   
    gameStatus = is_equal(elements.exit.pos,elements.hero.pos); // If the hero is in the exit means he finished the game
    return gameStatus; // Returns gameStatus (0 if nothing happened) (1 if hero wins) (-1 if hero dies)
}   

void logic::Elements::placeDragons(logic::Game game) // Places the dragons in their FIRST positions
{   
    // Variables
    Dragon auxDragon;
    coordenadas aux;
    srand(time(NULL));

    // Cycle to fill every dragon position
    for(int i = 0; i < numDragons; i++)
    {
        while(1)
        {   
            // Inside the walls
            aux.j = 1 + rand() % (mapSize-2);
            aux.i = 1 + rand() % (mapSize-2);

            // Not a valid position if is the same as a wall
            if(game.map[aux.i][aux.j] == 'X') continue;

            // If the hero is within 1 square of the key or the sword
            // and within 2 squares of the hero
            // is NOT a valid position
            if(is_close(aux,key.pos) || is_close(aux,sword.pos) || is_close_dis(aux,hero.pos,2) ) continue;
            if(is_equal(aux,key.pos) || is_equal(aux,sword.pos)) continue;

            // If theres already a dragon in the position
            // is Not a valid position
            for(int j = 0; j < i; j++)
                if(is_equal(aux,dragons[j].pos)) continue;
            
            break;
        }

        // If the cycle ends it means it fond a valid position for the dragon
        // Initiates a new dragon
        auxDragon.alive = true;
        auxDragon.pos = aux;
        auxDragon.symbol = 'D';

        // Adds the dragon to the dragon vector
        dragons.push_back(auxDragon);
    }
}

void logic::Elements::placeExit(logic::Game& game) // Finds a valid place for the exit
{   
    srand(time(NULL));
    
    // Cycle to find a valid exit position
    while(1)
    {   
        // Generates a position in the lateral walls
        exit.pos.j = (mapSize-1) * (rand() % 2);
        exit.pos.i = 1 + rand() % (mapSize-2);

        // If the exit is generated within 1 square of the hero or the key
        // is NOT a valid position
        if(is_close(exit.pos,hero.pos) || is_close(exit.pos,key.pos)) continue;

        // If the exit is generated within 1 square of a dragon
        // is NOT a valid position
        for(int i = 0; i < numDragons; i++)
            if(is_close(exit.pos,dragons[i].pos)) continue;
        
        // If HERE means it generated a valid exit position
        break; 
    }

    // Updates exit pos
    game.map[exit.pos.i][exit.pos.j] = exit.symbol;
}

int logic::Elements::allDragonsDead() // Checks if all dragons are dead
{
    for(int i = 0; i < numDragons; i++)
        if(dragons[i].alive) return 0;

    return 1;
}

int is_close(coordenadas A, coordenadas B) // Checks if 2 elements are within 1 quare of 1 another (not diagonally)
{
    if(sqrt(abs(A.i - B.i) + abs(A.j - B.j)) == 1) return 1;
    else return 0;
}

int is_equal(coordenadas A, coordenadas B) // Checks if 2 elemenrs are in the same position
{
  if(A.i == B.i && A.j == B.j) return 1;
  else return 0;
}

int is_close_dis(coordenadas A, coordenadas B, int dist) // Checks if 2 elements are in an "Euclidean Distance" dist of 1 another
{
   if(sqrt(abs(A.i - B.i) + abs(A.j - B.j)) <= dist) return 1;
   else return 0;  
}

void checkValidMoves(vector<coordenadas>& validMoves, logic::Game game, logic::Dragon dragon) // Checks all the valid moves of the dragon in the argument
{   
    coordenadas validMove = {0,0};
    for(int i = -1; i < 2; i++)
    {
        for(int j = -1; j < 2; j++)
        {   
            if(i == 0 && j == 0) continue;
            validMove.i = i + dragon.pos.i;
            validMove.j = j + dragon.pos.j;
            switch (game.map[validMove.i][validMove.j])
            {
            case ' ':
            case 'S':
            case 'K':
                validMoves.push_back(validMove);
            break;
        
            default:
            break;
            }
        }
    }
}

int elementsAround(logic::Game game,coordenadas element)
{
    int count  = 0;
    for(int i = -1; i < 2; i++)
    {
        for(int j = -1; j < 2; j++)
        {   
            if(i == 0 && j == 0) continue;
            if(abs(i) == abs(j)) if(game.map[element.i + i][element.j + j] != ' ') count++;
        }
    }
    if(count > 1) return 1;
    else return 0;
}

int main()
{      
    // Variables
    cli::gameStart start;
    cli::gamePlay play;
    logic::Elements elements;
    logic::Game game;
    srand(time(NULL));
    elements.killedDragons = 0;

    // Hero
    elements.hero.pos = {1,1};
    elements.hero.hasSword = false;
    elements.hero.hasKey = false;
    elements.hero.symbol = 'H';

    // Key
    elements.key.pos = {swordkeyOffset + rand() % (mapSize-(swordkeyOffset*2)),swordkeyOffset + rand() % (mapSize-(swordkeyOffset*2))};
    elements.key.symbol = 'K';

    // Sword
    elements.sword.pos = {swordkeyOffset + rand() % (mapSize-(swordkeyOffset*2)),swordkeyOffset + rand() % (mapSize-(swordkeyOffset*2))};
    elements.sword.symbol = 'S';

    // In case the sword and key are genarated in the same position
    // this cycle will make sure both are in different positions
    while(is_equal(elements.sword.pos,elements.key.pos)) elements.sword.pos = {swordkeyOffset + rand() % (mapSize-(swordkeyOffset*2)),swordkeyOffset + rand() % (mapSize-(swordkeyOffset*2))};

    // Exit
    elements.exit.symbol = 'E';

    
    // Outside Walls
    for(int i = 0; i < mapSize; i++)
    {
        for(int j = 0; j < mapSize; j++)
        {
            if(i == 0 || i == (mapSize-1)) game.map[i][j] = 'X';
            else if(j == 0 || j == (mapSize-1)) game.map[i][j] = 'X';
            else game.map[i][j] = ' ';
        }
    }

    // Inside walls
    int maxInsideWalls = (mapSize-1)*(mapSize-1) * wallPercentage;
    coordenadas wallPos;
    for(int i = 0; i < maxInsideWalls; i++)
    {
        wallPos.i = 1 + rand() % (mapSize-2);
        wallPos.j = 1 + rand() % (mapSize-2);
        if(elementsAround(game,wallPos))
        {
            i--;
            continue;
        }
        if(game.map[wallPos.i][wallPos.j] == ' ') game.map[wallPos.i][wallPos.j] = 'X';
    }

    // Gamestatus 0 is game running;
    game.gameStatus = 0;

    if (!show_start_screen_torment()) return 0;

    // Starting game cycle
    start.cycle(elements);

    // Gameplay cycle
    play.cycle(game,elements);  

    // Presents the result, victory or lose
    show_end_screen_torment(game.gameStatus);
    return 0;
}