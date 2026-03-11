import os

class Config:
    SQLALCHEMY_DATABASE_URI = "sqlite:///blogyu.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = "clave-secreta-de-prueba"
    JWT_SECRET_KEY = "jwt-clave-secreta"
