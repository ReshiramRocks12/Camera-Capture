# Camera Capture
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0.en.html)
[![Python 3.13](https://img.shields.io/badge/python-3.13-blue.svg)](https://www.python.org/)

**Camera Capture** is a simple, web-based solution that enables streaming real-time video from a remote device's camera. By using an application such as [OBS Studio's Virtual Camera](https://obsproject.com/), users can integrate external devices as virtual face cams.

## Dependencies
Dependencies can be installed by executing the command below.
```
pip install -r requirements.txt
```

## Usage
> ⚠️ **Warning:** This application requires an SSL certificate with its respective private key.

`main.py` can be ran from the command line to quickly start a web server.

Certain properties can be modified by specifying arguments in the command line, which are listed below.
| Parameter | Value Type | Default Value | Description |
| :----------- | :------------- | :------------- | :------------ |
| `--host` | str | "0.0.0.0" | Network interface to bind the server to |
| `--port` | int | 8080 | Port to bind the server to |
| `--certfile` | str | ".\cert.pem" | A path to an SSL certificate file |
| `--keyfile` | str | ".\key.pem" | A path to an SSL private key file |
| `--password` | str | None | The password of the SSL private key |

Example:
```
python main.py --port 80
```
 ## License
 **Camera Capture** is released under the [GNU GPLv3 License](https://www.gnu.org/licenses/gpl-3.0.en.html).
