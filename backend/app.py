from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle
from io import BytesIO

app = Flask(__name__)
CORS(app, expose_headers=['X-Filename', 'Content-Disposition'])

# Configure SQLite database
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'instance', 'movie_props.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Constants
CURRENT_DB_VERSION = "1.1"  # Increment this when schema changes

# Movie Prop Images Model
class PropImage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    prop_id = db.Column(db.Integer, db.ForeignKey('movie_prop.id'), nullable=False)
    image_url = db.Column(db.String(200), nullable=False)
    order = db.Column(db.Integer, default=0)  # To maintain image order
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Movie Prop Model
class MovieProp(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    price = db.Column(db.Float, nullable=False)
    print_cost = db.Column(db.Float, nullable=False, default=0.0)  # Default print cost is 0
    category = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    images = db.relationship('PropImage', backref='prop', lazy=True, order_by='PropImage.order')

# Database Schema Version Model
class SchemaVersion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    version = db.Column(db.String(10), nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

# Discount Settings Model
class DiscountSettings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tier1_quantity = db.Column(db.Integer, nullable=False, default=5)
    tier1_discount = db.Column(db.Float, nullable=False, default=0.05)
    tier2_quantity = db.Column(db.Integer, nullable=False, default=10)
    tier2_discount = db.Column(db.Float, nullable=False, default=0.10)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

def get_current_schema_version():
    version = SchemaVersion.query.order_by(SchemaVersion.id.desc()).first()
    return version.version if version else None

def update_schema_version():
    new_version = SchemaVersion(version=CURRENT_DB_VERSION)
    db.session.add(new_version)
    db.session.commit()

def initialize_database():
    with app.app_context():
        db.create_all()
        
        # Check and update schema version
        current_version = get_current_schema_version()
        if current_version != CURRENT_DB_VERSION:
            update_schema_version()
            
        # Only seed if database is empty
        if not MovieProp.query.first():
            seed_sample_data()

# Initialize database on startup
initialize_database()

# Routes
@app.route('/api/props', methods=['GET'])
def get_props():
    props = MovieProp.query.all()
    return jsonify([{
        'id': prop.id,
        'name': prop.name,
        'description': prop.description,
        'price': prop.price,
        'print_cost': prop.print_cost,
        'category': prop.category,
        'created_at': prop.created_at.isoformat(),
        'images': [{
            'id': img.id,
            'image_url': img.image_url,
            'order': img.order
        } for img in prop.images]
    } for prop in props])

@app.route('/api/props/<int:prop_id>', methods=['GET'])
def get_prop(prop_id):
    prop = MovieProp.query.get_or_404(prop_id)
    return jsonify({
        'id': prop.id,
        'name': prop.name,
        'description': prop.description,
        'price': prop.price,
        'print_cost': prop.print_cost,
        'category': prop.category,
        'created_at': prop.created_at.isoformat(),
        'images': [{
            'id': img.id,
            'image_url': img.image_url,
            'order': img.order
        } for img in prop.images]
    })

@app.route('/api/props', methods=['POST'])
def create_prop():
    data = request.get_json()
    new_prop = MovieProp(
        name=data['name'],
        description=data['description'],
        price=data['price'],
        print_cost=data.get('print_cost', 0.0),
        category=data['category']
    )
    db.session.add(new_prop)
    db.session.flush()  # This gets us the new prop's ID

    # Add images
    for i, image_url in enumerate(data.get('images', [])):
        if i >= 5:  # Limit to 5 images
            break
        prop_image = PropImage(
            prop_id=new_prop.id,
            image_url=image_url,
            order=i
        )
        db.session.add(prop_image)

    db.session.commit()
    return jsonify({
        'id': new_prop.id,
        'name': new_prop.name,
        'description': new_prop.description,
        'price': new_prop.price,
        'print_cost': new_prop.print_cost,
        'category': new_prop.category,
        'created_at': new_prop.created_at.isoformat(),
        'images': [{
            'id': img.id,
            'image_url': img.image_url,
            'order': img.order
        } for img in new_prop.images]
    }), 201

# Admin Routes
@app.route('/api/admin/props', methods=['POST'])
def create_admin_prop():
    data = request.json
    new_prop = MovieProp(
        name=data['name'],
        description=data['description'],
        price=float(data['price']),
        print_cost=float(data.get('print_cost', 0.0)),
        category=data['category']
    )
    db.session.add(new_prop)
    db.session.flush()  # This gets us the new prop's ID

    # Add images
    for i, image_data in enumerate(data.get('images', [])):
        if i >= 5:  # Limit to 5 images
            break
        # Handle both string URLs and objects with image_url
        image_url = image_data if isinstance(image_data, str) else image_data.get('image_url')
        if image_url and isinstance(image_url, str):
            prop_image = PropImage(
                prop_id=new_prop.id,
                image_url=image_url,
                order=i
            )
            db.session.add(prop_image)

    db.session.commit()
    return jsonify({
        'id': new_prop.id,
        'name': new_prop.name,
        'description': new_prop.description,
        'price': new_prop.price,
        'print_cost': new_prop.print_cost,
        'category': new_prop.category,
        'created_at': new_prop.created_at.isoformat(),
        'images': [{
            'id': img.id,
            'image_url': img.image_url,
            'order': img.order
        } for img in new_prop.images]
    })

@app.route('/api/admin/props/<int:prop_id>', methods=['PUT'])
def update_admin_prop(prop_id):
    prop = MovieProp.query.get_or_404(prop_id)
    data = request.json
    
    prop.name = data.get('name', prop.name)
    prop.description = data.get('description', prop.description)
    prop.price = float(data.get('price', prop.price))
    prop.print_cost = float(data.get('print_cost', prop.print_cost))
    prop.category = data.get('category', prop.category)
    
    # Update images
    if 'images' in data:
        # Remove existing images
        PropImage.query.filter_by(prop_id=prop.id).delete()
        
        # Add new images
        for i, image_data in enumerate(data['images']):
            if i >= 5:  # Limit to 5 images
                break
            # Handle both string URLs and objects with image_url
            image_url = image_data if isinstance(image_data, str) else image_data.get('image_url')
            if image_url and isinstance(image_url, str):
                prop_image = PropImage(
                    prop_id=prop.id,
                    image_url=image_url,
                    order=i
                )
                db.session.add(prop_image)
    
    db.session.commit()
    return jsonify({
        'id': prop.id,
        'name': prop.name,
        'description': prop.description,
        'price': prop.price,
        'print_cost': prop.print_cost,
        'category': prop.category,
        'created_at': prop.created_at.isoformat(),
        'images': [{
            'id': img.id,
            'image_url': img.image_url,
            'order': img.order
        } for img in prop.images]
    })

@app.route('/api/admin/props/<int:prop_id>', methods=['DELETE'])
def delete_admin_prop(prop_id):
    prop = MovieProp.query.get_or_404(prop_id)
    # Delete associated images first
    PropImage.query.filter_by(prop_id=prop.id).delete()
    db.session.delete(prop)
    db.session.commit()
    return jsonify({'message': 'Prop deleted successfully'})

@app.route('/api/admin/export', methods=['GET'])
def export_database():
    props = MovieProp.query.all()
    data = {
        "schema_version": CURRENT_DB_VERSION,
        "export_date": datetime.utcnow().isoformat(),
        "props": [{
            "name": prop.name,
            "description": prop.description,
            "price": prop.price,
            "print_cost": prop.print_cost,
            "category": prop.category,
            "images": [img.image_url for img in prop.images]
        } for prop in props]
    }
    return jsonify(data)

@app.route('/api/admin/import', methods=['POST'])
def import_database():
    try:
        data = request.get_json()
        
        # Validate schema version
        if 'schema_version' not in data:
            return jsonify({'error': 'Missing schema version'}), 400
            
        schema_version = data['schema_version']
        if schema_version != CURRENT_DB_VERSION:
            return jsonify({
                'error': f'Schema version mismatch. Current: {CURRENT_DB_VERSION}, Import: {schema_version}. Please update your import file.'
            }), 400

        # Validate props data
        if 'props' not in data or not isinstance(data['props'], list):
            return jsonify({'error': 'Invalid data format'}), 400

        # Validate each prop
        for prop_data in data['props']:
            if not isinstance(prop_data, dict):
                return jsonify({'error': 'Invalid prop data format'}), 400
            if not all(key in prop_data for key in ['name', 'description', 'price', 'print_cost', 'category', 'images']):
                return jsonify({'error': 'Missing required fields'}), 400
            if not isinstance(prop_data['name'], str) or not prop_data['name']:
                return jsonify({'error': 'Invalid name field'}), 400
            if not isinstance(prop_data['description'], str) or not prop_data['description']:
                return jsonify({'error': 'Invalid description field'}), 400
            if not isinstance(prop_data['price'], (int, float)) or prop_data['price'] <= 0:
                return jsonify({'error': 'Invalid price field'}), 400
            if not isinstance(prop_data['print_cost'], (int, float)) or prop_data['print_cost'] < 0:
                return jsonify({'error': 'Invalid print cost field'}), 400
            if not isinstance(prop_data['category'], str) or not prop_data['category']:
                return jsonify({'error': 'Invalid category field'}), 400
            if not isinstance(prop_data['images'], list) or not all(isinstance(url, str) for url in prop_data['images']):
                return jsonify({'error': 'Invalid images field'}), 400

        # Clear existing data
        PropImage.query.delete()
        MovieProp.query.delete()

        # Import new data
        for prop_data in data['props']:
            prop = MovieProp(
                name=prop_data['name'],
                description=prop_data['description'],
                price=prop_data['price'],
                print_cost=prop_data['print_cost'],
                category=prop_data['category']
            )
            db.session.add(prop)
            db.session.flush()  # Get the prop ID

            # Add images
            for order, image_url in enumerate(prop_data['images']):
                image = PropImage(
                    prop_id=prop.id,
                    image_url=image_url,
                    order=order
                )
                db.session.add(image)

        db.session.commit()
        return jsonify({'message': 'Database imported successfully'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/discount-settings', methods=['GET'])
def get_discount_settings():
    settings = DiscountSettings.query.first()
    if not settings:
        settings = DiscountSettings()
        db.session.add(settings)
        db.session.commit()
    
    return jsonify({
        'tier1_quantity': settings.tier1_quantity,
        'tier1_discount': settings.tier1_discount,
        'tier2_quantity': settings.tier2_quantity,
        'tier2_discount': settings.tier2_discount
    })

@app.route('/api/admin/discount-settings', methods=['PUT'])
def update_discount_settings():
    try:
        data = request.json
        settings = DiscountSettings.query.first()
        if not settings:
            settings = DiscountSettings()
            db.session.add(settings)
        
        settings.tier1_quantity = int(data['tier1_quantity'])
        settings.tier1_discount = float(data['tier1_discount'])
        settings.tier2_quantity = int(data['tier2_quantity'])
        settings.tier2_discount = float(data['tier2_discount'])
        settings.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Discount settings updated successfully',
            'settings': {
                'tier1_quantity': settings.tier1_quantity,
                'tier1_discount': settings.tier1_discount,
                'tier2_quantity': settings.tier2_quantity,
                'tier2_discount': settings.tier2_discount
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/discount-settings', methods=['GET'])
def get_public_discount_settings():
    settings = DiscountSettings.query.first()
    if not settings:
        settings = DiscountSettings()
        db.session.add(settings)
        db.session.commit()
    
    return jsonify({
        'tier1_quantity': settings.tier1_quantity,
        'tier1_discount': settings.tier1_discount,
        'tier2_quantity': settings.tier2_quantity,
        'tier2_discount': settings.tier2_discount
    })

@app.route('/api/generate-invoice', methods=['POST'])
def generate_invoice():
    try:
        data = request.get_json()
        cart_items = data.get('items', [])
        
        # Create a BytesIO buffer for the PDF
        buffer = BytesIO()
        
        # Create the PDF object using the BytesIO buffer
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # Add logo
        logo_path = os.path.join(app.root_path, '..', 'frontend', 'public', 'images', 'agentur-logo.png')
        print(f"Looking for logo at: {os.path.abspath(logo_path)}")
        print(f"File exists: {os.path.exists(logo_path)}")
        if os.path.exists(logo_path):
            try:
                print(f"Attempting to load logo...")
                # Adjust logo position and size
                p.drawImage(logo_path, 
                          x=50,  # left margin
                          y=height - 120,  # from top
                          width=150,  # smaller width
                          height=80,  # explicit height
                          mask='auto'  # handle transparency
                )
                print("Logo loaded successfully")
            except Exception as e:
                print(f"Error loading logo: {str(e)}")
                import traceback
                print(traceback.format_exc())
        
        # Add more space after logo
        p.setFont("Helvetica-Bold", 24)
        p.drawString(50, height - 220, "INVOICE")
        
        # Adjust all subsequent y-positions
        p.setFont("Helvetica", 12)
        now = datetime.now()
        p.drawString(50, height - 250, f"Date: {now.strftime('%Y-%m-%d')}")
        p.drawString(50, height - 270, f"Invoice #: INV-{now.strftime('%Y%m%d%H%M%S')}")
        
        # Create table data
        table_data = [['Item', 'Price', 'Print Cost', 'Total']]
        total_amount = 0
        total_print_cost = 0
        
        for item in cart_items:
            price = float(item['price'])
            print_cost = float(item.get('print_cost', 0))
            total = price + print_cost
            total_amount += price
            total_print_cost += print_cost
            table_data.append([
                item['name'],
                f"${price:,.2f}",
                f"${print_cost:,.2f}",
                f"${total:,.2f}"
            ])
        
        # Get discount from request
        discount_percent = float(request.json.get('discountPercent', 0))
        discount_amount = (total_amount + total_print_cost) * discount_percent
        
        # Add totals
        table_data.append(['', '', 'Subtotal:', f"${total_amount:,.2f}"])
        table_data.append(['', '', 'Total Print Cost:', f"${total_print_cost:,.2f}"])
        if discount_percent > 0:
            table_data.append(['', '', f'Discount ({int(discount_percent * 100)}%):', f"-${discount_amount:,.2f}"])
        table_data.append(['', '', 'Total:', f"${(total_amount + total_print_cost - discount_amount):,.2f}"])
        
        # Create and style the table
        table = Table(table_data, colWidths=[250, 100, 100, 100])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, -3), (-1, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ALIGN', (-2, -3), (-1, -1), 'RIGHT'),
            ('FONTNAME', (-2, -3), (-1, -1), 'Helvetica-Bold')
        ]))
        
        # Draw the table
        table.wrapOn(p, width, height)
        table.drawOn(p, 50, height - 520)
        
        # Add footer
        p.setFont("Helvetica", 10)
        p.drawString(50, 50, "Thank you for your business!")
        p.drawString(50, 35, "Agentur Schein Berlin")
        
        # Save the PDF
        p.showPage()
        p.save()
        
        # Get the value of the BytesIO buffer
        pdf = buffer.getvalue()
        buffer.close()
        
        # Get invoice number for filename
        invoice_number = f"INV-{now.strftime('%Y%m%d%H%M%S')}"
        filename = f"{invoice_number}.pdf"
        
        response = make_response(pdf)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        response.headers['X-Filename'] = filename
        response.headers['Access-Control-Expose-Headers'] = 'X-Filename, Content-Disposition'
        print(f"Sending invoice with filename: {filename}")
        print(f"Headers: {dict(response.headers)}")
        
        return response
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def seed_sample_data():
    # Sample data with schema version
    sample_data = {
        "schema_version": CURRENT_DB_VERSION,
        "props": [
            {
                "name": "Back to the Future Hoverboard",
                "description": "Original prop hoverboard from Back to the Future Part II. This screen-used prop features the iconic pink coloring and green foot pad.",
                "price": 12999.99,
                "print_cost": 299.99,
                "category": "Transportation",
                "images": [
                    "https://images.unsplash.com/photo-1514036783265-fba9577ea01d?w=600",
                    "https://images.unsplash.com/photo-1513116476489-7635e79feb27?w=600"
                ]
            },
            {
                "name": "Indiana Jones Hat",
                "description": "Screen-worn fedora from Raiders of the Lost Ark. Features the iconic brown felt and distressed finish.",
                "price": 25000.00,
                "print_cost": 149.99,
                "category": "Costumes",
                "images": [
                    "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=600"
                ]
            },
            {
                "name": "Star Wars Lightsaber",
                "description": "Original lightsaber prop used by Mark Hamill in Star Wars: A New Hope. Includes display case and authenticity certificate.",
                "price": 45000.00,
                "print_cost": 499.99,
                "category": "Weapons",
                "images": [
                    "https://images.unsplash.com/photo-1472457897821-70d3819a0e24?w=600"
                ]
            },
            {
                "name": "Jurassic Park Night Vision Goggles",
                "description": "Screen-matched night vision goggles as seen in the original Jurassic Park. Fully functional with green LED display.",
                "price": 4999.99,
                "print_cost": 199.99,
                "category": "Accessories",
                "images": [
                    "https://images.unsplash.com/photo-1589578228447-e1a4e481c6c8?w=600"
                ]
            }
        ]
    }
    
    for prop_data in sample_data["props"]:
        prop = MovieProp(
            name=prop_data["name"],
            description=prop_data["description"],
            price=prop_data["price"],
            print_cost=prop_data["print_cost"],
            category=prop_data["category"]
        )
        db.session.add(prop)
        db.session.flush()

        for order, image_url in enumerate(prop_data["images"]):
            image = PropImage(
                prop_id=prop.id,
                image_url=image_url,
                order=order
            )
            db.session.add(image)

    db.session.commit()
            
if __name__ == '__main__':
    app.run(debug=True, port=5001)
