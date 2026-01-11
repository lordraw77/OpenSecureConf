# Publishing Guide for OpenSecureConf Client

This guide explains how to publish the package to PyPI.

## Prerequisites

1. Install build tools:
```bash
pip install build twine
```

2. Create accounts:
   - PyPI: https://pypi.org/account/register/
   - TestPyPI (optional, for testing): https://test.pypi.org/account/register/

## Before Publishing

1. **Update version** in `pyproject.toml`
2. **Update your information** in `pyproject.toml`:
   - Replace `Your Name` and `your.email@example.com`
   - Update GitHub URLs with your repository
3. **Test locally**:
```bash
pip install -e .
python example_usage.py
```

4. **Run tests** (if you have them):
```bash
pip install -e ".[dev]"
pytest
```

## Build the Package

```bash
# Clean previous builds
rm -rf dist/ build/ *.egg-info

# Build distribution packages
python -m build
```

This creates two files in the `dist/` directory:
- `.tar.gz` - source distribution
- `.whl` - built distribution

## Test on TestPyPI (Optional but Recommended)

```bash
# Upload to TestPyPI
python -m twine upload --repository testpypi dist/*

# Test installation from TestPyPI
pip install --index-url https://test.pypi.org/simple/ opensecureconf-client
```

## Publish to PyPI

```bash
# Upload to PyPI
python -m twine upload dist/*
```

You'll be prompted for your PyPI username and password.

### Using API Tokens (Recommended)

For better security, use API tokens:

1. Go to https://pypi.org/manage/account/token/
2. Create a new API token
3. Use `__token__` as username and the token as password

Or configure in `~/.pypirc`:
```ini
[pypi]
username = __token__
password = pypi-YOUR-API-TOKEN-HERE
```

## After Publishing

1. Verify the package appears on PyPI:
   - https://pypi.org/project/opensecureconf-client/

2. Test installation:
```bash
pip install opensecureconf-client
```

3. Create a GitHub release matching the version tag

## Version Management

Follow Semantic Versioning (semver.org):
- **MAJOR** version for incompatible API changes
- **MINOR** version for backward-compatible functionality
- **PATCH** version for backward-compatible bug fixes

Example versions:
- `1.0.0` - Initial release
- `1.0.1` - Bug fix
- `1.1.0` - New feature (backward compatible)
- `2.0.0` - Breaking changes

## Updating an Existing Package

1. Update version in `pyproject.toml`
2. Update `README.md` with changes
3. Build and upload:
```bash
rm -rf dist/
python -m build
python -m twine upload dist/*
```

## Checklist Before Publishing

- [ ] Version number updated in `pyproject.toml`
- [ ] All author/maintainer information updated
- [ ] README.md is complete and accurate
- [ ] LICENSE file is present
- [ ] Code is tested and working
- [ ] Dependencies are correctly specified
- [ ] GitHub repository URLs are updated
- [ ] Package builds without errors
- [ ] Tested on TestPyPI (optional)

## Common Issues

### "File already exists"
You cannot upload the same version twice. Increment the version number.

### "Invalid authentication"
Check your PyPI credentials or API token.

### Missing files in package
Check `MANIFEST.in` and ensure all necessary files are included.

## Resources

- PyPI: https://pypi.org
- Packaging Guide: https://packaging.python.org
- Twine Documentation: https://twine.readthedocs.io
- TestPyPI: https://test.pypi.org
