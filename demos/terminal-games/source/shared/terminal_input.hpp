#pragma once

#if defined(_WIN32)
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <conio.h>

namespace termio {

inline void enableAnsi() {
    HANDLE hOut = GetStdHandle(STD_OUTPUT_HANDLE);
    if (hOut == INVALID_HANDLE_VALUE) return;
    DWORD dwMode = 0;
    if (!GetConsoleMode(hOut, &dwMode)) return;
    dwMode |= ENABLE_VIRTUAL_TERMINAL_PROCESSING;
    SetConsoleMode(hOut, dwMode);
}

inline void hideCursor(bool hide) {
    HANDLE hOut = GetStdHandle(STD_OUTPUT_HANDLE);
    if (hOut == INVALID_HANDLE_VALUE) return;
    CONSOLE_CURSOR_INFO info;
    if (!GetConsoleCursorInfo(hOut, &info)) return;
    info.bVisible = hide ? FALSE : TRUE;
    SetConsoleCursorInfo(hOut, &info);
}

inline void clearScreen() {
    HANDLE hOut = GetStdHandle(STD_OUTPUT_HANDLE);
    if (hOut == INVALID_HANDLE_VALUE) return;
    CONSOLE_SCREEN_BUFFER_INFO csbi;
    if (!GetConsoleScreenBufferInfo(hOut, &csbi)) return;
    DWORD count;
    COORD home = {0, 0};
    FillConsoleOutputCharacterA(hOut, ' ', csbi.dwSize.X * csbi.dwSize.Y, home, &count);
    FillConsoleOutputAttribute(hOut, csbi.wAttributes, csbi.dwSize.X * csbi.dwSize.Y, home, &count);
    SetConsoleCursorPosition(hOut, home);
}

enum class Key {
    None,
    Up,
    Down,
    Left,
    Right,
    W,
    A,
    S,
    D,
    Enter,
    Escape,
    F,
    Other
};

inline Key readKeyNonBlocking() {
    if (!_kbhit()) return Key::None;

    int c = _getch();
    if (c == 0 || c == 224) {
        int ext = _getch();
        switch (ext) {
        case 72: return Key::Up;
        case 80: return Key::Down;
        case 75: return Key::Left;
        case 77: return Key::Right;
        default: return Key::Other;
        }
    }

    switch (c) {
    case 27: return Key::Escape;
    case 13: return Key::Enter;
    case 'w':
    case 'W': return Key::W;
    case 'a':
    case 'A': return Key::A;
    case 's':
    case 'S': return Key::S;
    case 'd':
    case 'D': return Key::D;
    case 'f':
    case 'F': return Key::F;
    default: return Key::Other;
    }
}

inline bool keyToDir(Key k, int& di, int& dj) {
    switch (k) {
    case Key::Left:
    case Key::A: di = 0; dj = -1; return true;
    case Key::Right:
    case Key::D: di = 0; dj = 1; return true;
    case Key::Up:
    case Key::W: di = -1; dj = 0; return true;
    case Key::Down:
    case Key::S: di = 1; dj = 0; return true;
    default: return false;
    }
}

inline void sleepMs(int ms) { Sleep(ms); }

}

#else
#include <termios.h>
#include <unistd.h>
#include <fcntl.h>

namespace termio {

inline void enableAnsi() {}
inline void hideCursor(bool) {}
inline void clearScreen() { ::write(1, "\033[2J\033[H", 7); }

enum class Key { None, Up, Down, Left, Right, W, A, S, D, Enter, Escape, F, Other };

inline bool setNonBlockingStdin(bool enable) {
    int flags = fcntl(STDIN_FILENO, F_GETFL, 0);
    if (flags == -1) return false;
    if (enable) flags |= O_NONBLOCK; else flags &= ~O_NONBLOCK;
    return fcntl(STDIN_FILENO, F_SETFL, flags) == 0;
}

inline Key readKeyNonBlocking() {
    unsigned char c;
    ssize_t n = ::read(STDIN_FILENO, &c, 1);
    if (n <= 0) return Key::None;

    if (c == '\033') {
        unsigned char seq[2];
        if (::read(STDIN_FILENO, &seq[0], 1) <= 0) return Key::Escape;
        if (::read(STDIN_FILENO, &seq[1], 1) <= 0) return Key::Escape;
        if (seq[0] == '[') {
            switch (seq[1]) {
            case 'A': return Key::Up;
            case 'B': return Key::Down;
            case 'C': return Key::Right;
            case 'D': return Key::Left;
            default: return Key::Other;
            }
        }
        return Key::Other;
    }

    switch (c) {
    case 27: return Key::Escape;
    case '\n':
    case '\r': return Key::Enter;
    case 'w':
    case 'W': return Key::W;
    case 'a':
    case 'A': return Key::A;
    case 's':
    case 'S': return Key::S;
    case 'd':
    case 'D': return Key::D;
    case 'f':
    case 'F': return Key::F;
    default: return Key::Other;
    }
}

inline bool keyToDir(Key k, int& di, int& dj) {
    switch (k) {
    case Key::Left:
    case Key::A: di = 0; dj = -1; return true;
    case Key::Right:
    case Key::D: di = 0; dj = 1; return true;
    case Key::Up:
    case Key::W: di = -1; dj = 0; return true;
    case Key::Down:
    case Key::S: di = 1; dj = 0; return true;
    default: return false;
    }
}

inline void sleepMs(int ms) { usleep(ms * 1000); }

}

#endif
