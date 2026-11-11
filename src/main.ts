const root = document.getElementById('app');
if (!root) throw new Error('找不到應用程式入口。');

if (new URLSearchParams(location.search).get('prototype') === 'classic') {
  void import('./classic');
} else {
  void import('./arena/app').then(({ mountArena }) => mountArena(root));
}
