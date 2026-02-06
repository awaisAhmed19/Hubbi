
from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")



@app.route("/three-stage")
def three_stage():
    return render_template("three-stage.html")



if __name__ == "__main__":
    app.run(debug=True)

