#include <iostream>
#include <cstdlib>
#include <cmath>
using namespace std;

#include "../shared/terminal_input.hpp"

#if defined(_WIN32)
static void clear_screen_local() { termio::clearScreen(); }
#else
static void clear_screen_local() { system("clear"); }
#endif

static void wait_for_any_key_or_escape() {
    while (1) {
        termio::Key k = termio::readKeyNonBlocking();
        if (k != termio::Key::None) return;
        termio::sleepMs(10);
    }
}

static bool show_start_screen_herebedragons() {
    clear_screen_local();
    termio::enableAnsi();
    termio::hideCursor(true);

    cout << "\033[1;35m";
    cout << "==============================\n";
    cout << "        HERE BE DRAGONS       \n";
    cout << "==============================\n";
    cout << "\033[0m\n";

    cout << "A small maze. One dragon nearby.\n";
    cout << "Find the key, then reach the exit without dying.\n\n";

    cout << "Symbols:\n";
    cout << "  H = You    D = Dragon    K = Key    E = Exit    X = Wall\n\n";

    cout << "Rules:\n";
    cout << "  - If you move next to the dragon, you lose.\n";
    cout << "  - Grab the key before escaping.\n";
    cout << "  - The exit won't let you through until you have the key.\n\n";

    cout << "Controls:\n";
    cout << "  - Move: WASD or Arrow Keys\n";
    cout << "  - Start: F\n";
    cout << "  - Quit: ESC\n\n";

    cout << "Press any key to continue...\n";

    wait_for_any_key_or_escape();
    termio::Key k = termio::readKeyNonBlocking();
    if (k == termio::Key::Escape) { termio::hideCursor(false); return false; }
    return true;
}

static void show_end_screen_herebedragons(int state) {
    clear_screen_local();
    termio::enableAnsi();
    termio::hideCursor(true);

    if (state == 2) {
        cout << "\033[1;32m";
        cout << "==============================\n";
        cout << "           VICTORY            \n";
        cout << "==============================\n";
        cout << "\033[0m\n";
        cout << "The gate opens. You slip past the legends.\n\n";
    } else {
        cout << "\033[1;31m";
        cout << "==============================\n";
        cout << "            DEFEAT            \n";
        cout << "==============================\n";
        cout << "\033[0m\n";
        cout << "A shadow breathes fire close enough to end it all.\n\n";
    }

    cout << "Press Enter (or ESC) to exit...\n";
    while (1) {
        termio::Key k = termio::readKeyNonBlocking();
        if (k == termio::Key::Enter || k == termio::Key::Escape) break;
        termio::sleepMs(10);
    }
    termio::hideCursor(false);
}

struct coordenadas{
    int i ;
    int j ;
};

int is_close(coordenadas A, coordenadas B)
{
    if(sqrt(abs(A.i - B.i) + abs(A.j - B.j)) == 1) return 1;
    else return 0;
}

coordenadas exit_place(coordenadas H, coordenadas K, coordenadas D)
{   
    coordenadas aux;
    srand(time(NULL));
    
    while(1)
    {
        aux.j = 9 * (rand() % 2);
        aux.i = 1 + rand() % 8;
        if(is_close(aux,H) || is_close(aux,K) || is_close(aux,D)) continue;
        else break; 
    }

    return aux;
}

int game_state_update(coordenadas H, coordenadas D, coordenadas K, coordenadas E, int game_state)
{
    if(is_close(D,H)) return -1;
    if((game_state != 1) && (K.i == H.i && K.j == H.j)) return 1;
    else if((game_state == 1) && (E.i == H.i && E.j == H.j)) return 2;
    else return game_state;
}

int can_exit(coordenadas H, coordenadas E, int game_state, int i, int j)
{   
    if((game_state == 0) && (E.i == (H.i+i) && E.j == (H.j+j))) return 0;
    else return 1;
    
}

namespace cli
{

}
int main()
{      
    srand(time(NULL));
    termio::enableAnsi();

    if (!show_start_screen_herebedragons()) return 0;

    coordenadas H ;
    H.i= 1 ; H.j = 1;
    coordenadas K ;
    K.i = 8 ; K.j = 1;
    coordenadas D ;
    D.i = 5 ; D.j = 4;
    coordenadas E = exit_place(H,K,D);

    int game_state = 0;

    char maze[10][10] = {
        {'X','X','X','X','X','X','X','X','X','X'},
        {'X',' ',' ',' ',' ',' ',' ',' ',' ','X'},
        {'X',' ','X','X',' ','X',' ','X',' ','X'},
        {'X',' ','X','X',' ','X',' ','X',' ','X'},
        {'X',' ','X','X',' ','X',' ','X',' ','X'},
        {'X',' ',' ',' ',' ',' ',' ','X',' ','X'},
        {'X',' ','X','X',' ','X',' ','X',' ','X'},
        {'X',' ','X','X',' ','X',' ','X',' ','X'},
        {'X',' ','X','X',' ',' ',' ',' ',' ','X'},
        {'X','X','X','X','X','X','X','X','X','X'}
    };
    
    maze[H.i][H.j] = 'H';
    maze[E.i][E.j] = 'E';
    maze[K.i][K.j] = 'K';
    maze[D.i][D.j] = 'D';

    termio::hideCursor(true);

    while(1)
    {
        clear_screen_local();
        cout << "   HERE BE DRAGONS\n";
        cout << "   press F to start\n";

        termio::Key k = termio::readKeyNonBlocking();
        if (k == termio::Key::F) break;
        if (k == termio::Key::Escape) { termio::hideCursor(false); return 0; }
        termio::sleepMs(10);
    }

    clear_screen_local();

    while(1)
    {
        maze[H.i][H.j] = 'H';

        for (int i = 0; i < 10; i++)
           for (int j = 0; j < 10; j++)
            cout << maze[i][j] << " \n"[j == 9];

        game_state = game_state_update(H,D,K,E,game_state);

        switch (game_state)
        {

        case -1:
            cout << "\n You lost the game!!\n";
            show_end_screen_herebedragons(game_state);
            return 1;
        break;

        case 2:
            cout << "\n You won the game!!\n";
            show_end_screen_herebedragons(game_state);
            return 0;
        break;

        default:
        break;
        }

        maze[H.i][H.j]= ' ';

        int di = 0, dj = 0;
        while (1) {
            termio::Key k = termio::readKeyNonBlocking();
            if (k == termio::Key::Escape) { termio::hideCursor(false); return 0; }
            if (termio::keyToDir(k, di, dj)) break;
            termio::sleepMs(10);
        }

        int ni = H.i + di;
        int nj = H.j + dj;
        if(maze[ni][nj] != 'X' && can_exit(H,E,game_state,di,dj)) { H.i = ni; H.j = nj; }

        clear_screen_local();
    }

    termio::hideCursor(false);
    return 0;
}