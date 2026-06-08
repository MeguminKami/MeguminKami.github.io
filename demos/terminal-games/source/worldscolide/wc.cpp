#include <iostream>

static void clear_screen_local() {
#if defined(_WIN32)
    std::system("cls");
#else
    std::system("clear");
#endif
}

static void start_screen() {
    clear_screen_local();
    std::cout << "==============================\n";
    std::cout << "        WORLDS COLIDE         \n";
    std::cout << "==============================\n\n";
    std::cout << "This world is still being forged.\n";
    std::cout << "For now, consider this a campfire between adventures.\n\n";
    std::cout << "Press Enter to continue...\n";
    std::cin.get();
}

static void end_screen() {
    clear_screen_local();
    std::cout << "==============================\n";
    std::cout << "            GOODBYE           \n";
    std::cout << "==============================\n\n";
    std::cout << "Press Enter to exit...\n";
    std::cin.get();
}

int main() {
    start_screen();
    clear_screen_local();
    std::cout << "Worlds Colide\n";
    std::cout << "(work in progress)\n\n";
    end_screen();
    return 0;
}
