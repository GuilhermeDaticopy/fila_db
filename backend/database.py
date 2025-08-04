# backend/database.py
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy() # Inicializa o SQLAlchemy sem passar o app Flask aqui

# Nota: A conexão real será testada quando tentarmos interagir com os modelos
# ou quando o Flask-Migrate for executado.
