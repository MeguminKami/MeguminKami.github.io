#include <iostream>
#include <cstdlib>
#include <cmath>
#include <cstring>
#include "dragonsbane.hpp"
#include "../shared/terminal_input.hpp"
#define mapSize 50

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

static bool show_start_screen_dragonsbane() {
    clear_screen_local();
    termio::enableAnsi();
    termio::hideCursor(true);

    cout << "\033[1;35m";
    cout << "==============================\n";
    cout << "        DRAGON'S BANE         \n";
    cout << "==============================\n";
    cout << "\033[0m\n";

    cout << "You are the hero trapped in a cursed maze.\n";
    cout << "Find the \033[1;33mKey (K)\033[0m, claim the \033[1;36mSword (S)\033[0m,\n";
    cout << "and hunt every dragon before you escape.\n\n";

    cout << "Symbols:\n";
    cout << "  \033[1;34mH\033[0m = Hero     \033[1;31mD\033[0m = Dragon     \033[1;31mF\033[0m = Dragon on treasure\n";
    cout << "  \033[1;36mS\033[0m = Sword    \033[1;33mK\033[0m = Key        E = Exit     X = Wall\n\n";

    cout << "Rules:\n";
    cout << "  - Without the sword, getting too close to a dragon means death.\n";
    cout << "  - With the sword, you can slay dragons by confronting them.\n";
    cout << "  - You can only leave through the exit after you have the key\n";
    cout << "    and all dragons are dead.\n\n";

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

static void show_end_screen_dragonsbane(int status) {
    clear_screen_local();
    termio::enableAnsi();
    termio::hideCursor(true);

    if (status == 1) {
        cout << "\033[1;32m";
        cout << "==============================\n";
        cout << "           VICTORY            \n";
        cout << "==============================\n";
        cout << "\033[0m\n";
        cout << "The last dragon falls. The key turns.\n";
        cout << "You step into the night as a legend.\n\n";
    } else {
        cout << "\033[1;31m";
        cout << "==============================\n";
        cout << "            DEFEAT            \n";
        cout << "==============================\n";
        cout << "\033[0m\n";
        cout << "The maze grows silent. Your story ends here.\n\n";
    }

    cout << "Press Enter (or ESC) to exit...\n";
    while (1) {
        termio::Key k = termio::readKeyNonBlocking();
        if (k == termio::Key::Enter || k == termio::Key::Escape) break;
        termio::sleepMs(10);
    }
    termio::hideCursor(false);
}

void cli::gameStart::cycle(logic::Elements& elements)
{
    clear_screen_local();
    termio::enableAnsi();
    printf("Welcome to Dragon's Bane!\nPlease insert the number of dragons (1-5) => ");

    cin >> elements.numDragons;
    while(!(1 <= elements.numDragons && elements.numDragons <= 5))
    {
        cout << "\033[1F" << "\033[2K";
        printf("You can only have 1 to 5 Dragons =>  ");
        cin >> elements.numDragons;
    }
    clear_screen_local();
}

void cli::gamePlay::printMap(logic::Game game)
{
    clear_screen_local();

    for (int i = 0; i < 10; i++)
            for (int j = 0; j < 10; j++)
                cout << game.map[i][j] << " \n"[j == 9];
}

void cli::gamePlay::updateMap(logic::Game& game, logic::Elements elements)
{
    game.map[elements.hero.pos.i][elements.hero.pos.j] = elements.hero.symbol;

    if(!elements.hero.hasKey) game.map[elements.key.pos.i][elements.key.pos.j] = elements.key.symbol;

    if(!elements.hero.hasSword) game.map[elements.sword.pos.i][elements.sword.pos.j] = elements.sword.symbol;

    for(int i = 0; i < elements.numDragons; i++)
    {
        if(elements.dragons[i].alive) game.map[elements.dragons[i].pos.i][elements.dragons[i].pos.j] = elements.dragons[i].symbol;
    }
}

void cli::gamePlay::cycle(logic::Game& game,logic::Elements elements)
{
    termio::enableAnsi();
    termio::hideCursor(true);

    elements.placeDragons(game);
    elements.placeExit(game);

    while (1)
    {
        updateMap(game,elements);
        printMap(game);

        game.map[elements.hero.pos.i][elements.hero.pos.j] = ' ';
        for(int i = 0; i < elements.numDragons; i++) game.map[elements.dragons[i].pos.i][elements.dragons[i].pos.j] = ' ';

        int di = 0, dj = 0;
        while (1) {
            termio::Key k = termio::readKeyNonBlocking();
            if (k == termio::Key::Escape) { termio::hideCursor(false); return; }
            if (termio::keyToDir(k, di, dj)) break;
            termio::sleepMs(10);
        }

        elements.moveHeroDir(game, di, dj);
        game.map[elements.hero.pos.i][elements.hero.pos.j] = elements.hero.symbol;
        if(game.updateGame(elements)) { termio::hideCursor(false); return; }

        for(int i = 0; i < elements.numDragons; i++)
        {
            if(elements.dragons[i].alive)
            {
                elements.moveDragon(game,i);
                game.map[elements.dragons[i].pos.i][elements.dragons[i].pos.j] =  elements.dragons[i].symbol;
                if(game.updateGame(elements)) { termio::hideCursor(false); return; }
            }
        }
    }
}

void logic::Elements::moveHero(logic::Game game)
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

    if (newPos.i < 0 || newPos.i >= 10 || newPos.j < 0 || newPos.j >= 10) return;

    switch (game.map[newPos.i][newPos.j])
    {
    case 'S':
        hero.hasSword = true;
        hero.symbol = 'A';
        hero.pos = newPos;
    break;

    case 'K':
        hero.hasKey = true;
        hero.pos = newPos;
    break;

    case 'E':
        if(hero.hasKey && allDragonsDead()) hero.pos = newPos;
    break;

    case ' ':
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
            aux.j = 1 + rand() % 8;
            aux.i = 1 + rand() % 8;

            // Not a valid position if is the same as a wall
            if(game.map[aux.i][aux.j] == 'X') continue;

            // If the hero is within 1 square of the key or the sword
            // and within 2 squares of the hero
            // is NOT a valid position
            if(is_close(aux,key.pos) || is_close(aux,sword.pos) || is_close_dis(aux,hero.pos,2) ) continue;

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
        exit.pos.j = 9 * (rand() % 2);
        exit.pos.i = 1 + rand() % 8;

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

int main()
{
    // Variables
    cli::gameStart start;
    cli::gamePlay play;
    logic::Elements elements;
    logic::Game game;

    // Hero
    elements.hero.pos = {1,1};
    elements.hero.hasSword = false;
    elements.hero.hasKey = false;
    elements.hero.symbol = 'H';

    // Key
    elements.key.pos = {8,1};
    elements.key.symbol = 'K';

    // Sword
    elements.sword.pos = {1,8};
    elements.sword.symbol = 'S';

    // Exit
    elements.exit.symbol = 'E';

    // Walls
    char walls[mapSize][mapSize] = {
        {'X','X','X','X','X','X','X','X','X','X'},
        {'X',' ',' ',' ',' ',' ',' ',' ',' ','X'},
        {'X',' ','X','X',' ','X',' ','X',' ','X'},
        {'X',' ','X','X',' ','X',' ','X',' ','X'},
        {'X',' ','X','X',' ','X',' ','X',' ','X'},
        {'X',' ',' ',' ',' ',' ',' ','X',' ','X'},
        {'X',' ','X','X',' ','X',' ','X',' ','X'},
        {'X',' ','X','X',' ','X',' ','X',' ','X'},
        {'X',' ','X','X',' ',' ',' ','X',' ','X'},
        {'X','X','X','X','X','X','X','X','X','X'}
    };

    for(int i = 0; i < 10; i++)
    {
        for(int j = 0; j < 10; j++) game.map[i][j] = walls[i][j];
    }

    game.gameStatus = 0;

    if (!show_start_screen_dragonsbane()) return 0;

    start.cycle(elements);
    play.cycle(game,elements);

    show_end_screen_dragonsbane(game.gameStatus);
    return 0;
}