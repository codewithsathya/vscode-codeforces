#include <bits/stdc++.h>
using namespace std;
using ll = long long;

int MOD = 1000000009;

void solve() {
    int a, b;
    cin >> a >> b;
    cout << min(a, b) << " " << max(a, b) << "\n";
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int t;
    cin >> t;
    while(t--) {
        solve();
    }
    return 0;
}