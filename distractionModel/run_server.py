# Run this file on server to return a Concentration Index (CI).
# Analysis is in 'Util' folder.

import base64
import io
import sys

import cv2
import numpy as np
from flask import (Flask, Response, jsonify, json, make_response, render_template,
                   request, send_file, send_from_directory)

from flask_cors import CORS, cross_origin
from util.analysis_server import analysis
from PIL import Image
from io import BytesIO
# from StringIO import StringIO

sys.path.append("../")

# from VideoCap import VideoCap


app = Flask(__name__)
cors = CORS(app, resources={r'/*': {"origins": ['*',"http://localhost:3000"]}})
app.config['CORS_HEADER'] = 'Content-Type'
threadDict = {}
ana = analysis()


def stringToImage(base64_string):
    imgdata = base64.b64decode(base64_string)
    return Image.open(io.BytesIO(imgdata))


def toRGB(image):
    return cv2.cvtColor(np.array(image), cv2.COLOR_BGR2RGB)


def readb64(base64_string):
    sbuf = BytesIO()
    sbuf.write(base64.b64decode(base64_string))
    pimg = Image.open(sbuf)
    return cv2.cvtColor(np.array(pimg), cv2.COLOR_RGB2BGR)


def data_uri_to_cv2_img(uri):
    # encoded_data = uri.split(',')[1]
    nparr = np.fromstring(uri.decode('base64'), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


@app.route('/predict', methods=['GET', 'POST'])
@cross_origin(origin='*', headers=['Content-Type'])
def predictImage():
    print("Received request to /predict endpoint")
    try:
        data = request.get_json(force=True)
        print(f"Request data keys: {data.keys()}")
        
        datainString = data.get('image')
        if not datainString:
            print("No image data found")
            return jsonify({"error": "No image data provided"}), 400
            
        try:
            img = readb64(datainString)
            print(f"Image processed successfully. Shape: {img.shape}")
            
            # Get the concentration index (which is apparently a float)
            concentration_index = ana.detect_face(img)
            print(f"Analysis complete")
            
            # Return the value as JSON
            return jsonify({"concentration_index": float(concentration_index)})
            
        except Exception as e:
            print(f"Error processing image: {str(e)}")
            return jsonify({"error": f"Error processing image: {str(e)}"}), 500
            
    except Exception as e:
        print(f"Error parsing request: {str(e)}")
        return jsonify({"error": f"Error parsing request: {str(e)}"}), 400
@app.route('/', methods=['GET'])
def home():
    return "Flask server is running!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5000)
