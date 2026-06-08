#include <vector>
using namespace std;
#define mapSize 30
#define wallPercentage 0.5
#define maxDragons 40
#define swordkeyOffset 5

namespace cli
{   
    class gameStart;
    class gamePlay;
}

namespace logic
{
    class Elements;
    class Hero;
    class Dragon;
    class Sword;
    class Key;
    class Exit; 
    class Game;
}

struct coordenadas{
    int i ;
    int j ;
};

class cli::gameStart
{
    public:
        void cycle(logic::Elements& elements);
};

class cli::gamePlay
{
    public:
        void printMap(logic::Game game, logic::Elements elements);
        void cycle(logic::Game& game, logic::Elements elements);
        void updateMap(logic::Game& game, logic::Elements elements);
};

class logic::Game
{   
    public:
        char map[mapSize][mapSize];
        int gameStatus;
        int updateGame(logic::Elements& elements);
};

class logic::Hero
{   
    public:
        coordenadas pos;
        bool hasSword;
        bool hasKey;
        char symbol;
};

class logic::Dragon
{
    public:
        coordenadas pos;
        char symbol;
        bool alive;
};

class logic::Sword
{
    public:
        coordenadas pos;
        char symbol;
};

class logic::Key
{
    public:
        coordenadas pos;
        char symbol;

};

class logic::Exit
{
    public:
        coordenadas pos;
        char symbol;
};

class logic::Elements
{
    public:
        Hero hero;
        vector<Dragon> dragons;
        int numDragons;
        Sword sword;
        Key key;
        Exit exit; 
        void moveHero(logic::Game game);
        void moveHeroDir(logic::Game game, int di, int dj);
        void moveDragon(logic::Game game, int dragonID);
        void placeDragons(logic::Game game);
        void placeExit(logic::Game& game);
        int allDragonsDead();
        int killedDragons;
};

int is_close(coordenadas A, coordenadas B);
int is_equal(coordenadas A, coordenadas B);
int is_close_dis(coordenadas A, coordenadas B, int dist);
void checkValidMoves(vector<coordenadas>& validMoves, logic::Game game, logic::Dragon dragon);
int elementsAround(logic::Game game,coordenadas element);
