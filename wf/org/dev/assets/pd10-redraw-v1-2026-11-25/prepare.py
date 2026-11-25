from pathlib import Path
import io
import json
import shutil
import subprocess
import tarfile

assets = Path(__file__).resolve().parent
root = Path('/tmp/aos/arena_cheater/dev/pd10-redraw-v1-2026-11-25')
workspace = root / 'new'
revision = '03b15e1f05ad5701f6c47f7fb7fcc62460c39cfd'
assert not workspace.exists(), 'Preserve the existing evidence; choose a fresh root first.'
workspace.mkdir(parents=True)
with tarfile.open(fileobj=io.BytesIO(subprocess.check_output(['git', 'archive', revision]))) as archive:
    archive.extractall(workspace, filter='data')
shutil.rmtree(workspace / 'tests')
(workspace / 'tests/simulation').mkdir(parents=True)
(workspace / 'node_modules').symlink_to(Path('node_modules').resolve(), target_is_directory=True)
for name in ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'src/main.ts']:
    assert (workspace / name).read_bytes() == Path(name).read_bytes(), name
subprocess.run(['patch', '-p1', '-i', str(assets / 'instrumentation.patch')], cwd=workspace, check=True)
shutil.copyfile(assets / 'audit.ts', workspace / 'src/arena/shared/audit.ts')
shutil.copyfile(assets / 'runner.test.ts', workspace / 'tests/simulation/pd10.test.ts')
shutil.copyfile(assets / 'pd10-config.json', workspace / 'pd10-config.json')
print(workspace)
