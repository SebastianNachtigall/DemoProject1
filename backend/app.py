from flask import Flask, jsonify, request, make_response, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle, SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from io import BytesIO
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file

app = Flask(__name__)
CORS(app, expose_headers=['X-Filename', 'Content-Disposition'])

# Configure SQLite database
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///' + os.path.join(basedir, 'instance', 'movie_props.db'))
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

# Order Model
class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(20), unique=True, nullable=False)
    order_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    total_amount = db.Column(db.Float, nullable=False)
    customer_name = db.Column(db.String(100))
    customer_email = db.Column(db.String(120))

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

# Email Settings Model
class EmailSettings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    notification_email = db.Column(db.String(100), nullable=False)
    smtp_server = db.Column(db.String(100), nullable=False)
    smtp_port = db.Column(db.Integer, nullable=False)
    smtp_username = db.Column(db.String(100), nullable=False)
    smtp_password = db.Column(db.String(100), nullable=False)
    smtp_use_tls = db.Column(db.Boolean, nullable=False, default=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

# Print Notification Model
class PrintNotification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(20), nullable=False)
    order_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    customer_name = db.Column(db.String(100), nullable=False)
    customer_email = db.Column(db.String(120), nullable=False)
    total_print_cost = db.Column(db.Float, nullable=False)
    order_details = db.Column(db.JSON, nullable=False)

def get_current_schema_version():
    version = SchemaVersion.query.order_by(SchemaVersion.id.desc()).first()
    return version.version if version else None

def update_schema_version():
    new_version = SchemaVersion(version=CURRENT_DB_VERSION)
    db.session.add(new_version)
    db.session.commit()

def initialize_database():
    with app.app_context():
        # Drop all tables and recreate them
        db.drop_all()
        db.create_all()
        
        # Initialize email settings
        email_settings = EmailSettings.query.first()
        if not email_settings:
            email_settings = EmailSettings(
                notification_email='notifications@example.com',
                smtp_server='smtp.gmail.com',
                smtp_port=587,
                smtp_username='your-email@gmail.com',
                smtp_password='your-app-password',
                smtp_use_tls=True
            )
            db.session.add(email_settings)
            db.session.commit()
            
        # Seed initial data if needed
        if not MovieProp.query.first():
            seed_sample_data()

def send_print_notification(order_details, customer_details):
    try:
        # Calculate total print cost
        total_print_cost = sum(
            item.get('print_cost', 0) * item.get('quantity', 1)
            for item in order_details.get('items', [])
            if item.get('printedVersion')
        )
        
        # Create new print notification
        notification = PrintNotification(
            invoice_number=order_details.get('invoiceNumber', 'N/A'),
            order_date=datetime.now(),
            customer_name=customer_details['name'],
            customer_email=customer_details['email'],
            total_print_cost=total_print_cost,
            order_details=order_details
        )
        
        # Save to database
        db.session.add(notification)
        db.session.commit()
        
        # Try to send email if configured
        email_settings = EmailSettings.query.first()
        if email_settings and email_settings.smtp_server:
            try:
                send_email_notification(notification, email_settings)
            except Exception as e:
                print(f"Failed to send email: {str(e)}")
                # Continue even if email fails
                pass
                
        return True
    except Exception as e:
        print(f"Error in send_print_notification: {str(e)}")
        return False

def generate_invoice_number():
    # Get current year and month
    now = datetime.now()
    year_month = now.strftime('%Y%m')
    
    # Get the latest order with an invoice number starting with the current year/month
    latest_order = Order.query.filter(
        Order.invoice_number.like(f"{year_month}-%")
    ).order_by(Order.id.desc()).first()
    
    if latest_order and latest_order.invoice_number:
        # Extract the sequence number from the latest invoice
        sequence = int(latest_order.invoice_number[-4:]) + 1
    else:
        # Start new sequence for new year/month
        sequence = 1
    
    # Format: YYYYMM-XXXX (e.g., 202412-0001)
    return f"{year_month}-{sequence:04d}"

@app.route('/api/print-notifications', methods=['GET'])
def get_print_notifications():
    try:
        notifications = PrintNotification.query.order_by(PrintNotification.order_date.desc()).all()
        return jsonify([{
            'id': n.id,
            'invoice_number': n.invoice_number,
            'order_date': n.order_date.isoformat(),
            'customer_name': n.customer_name,
            'customer_email': n.customer_email,
            'total_print_cost': n.total_print_cost
        } for n in notifications])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def generate_print_notification_pdf(notification):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=10
    )
    elements.append(Paragraph("Print Order Notification", title_style))
    elements.append(Paragraph(f"Invoice #: {notification.invoice_number}", styles['Normal']))
    elements.append(Spacer(1, 20))

    # Customer Details
    customer_style = ParagraphStyle(
        'CustomerInfo',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=20
    )
    customer_info = f"""
    <b>Customer Details:</b><br/>
    Name: {notification.customer_name}<br/>
    Email: {notification.customer_email}<br/>
    Order Date: {notification.order_date.strftime('%Y-%m-%d %H:%M:%S')}
    """
    elements.append(Paragraph(customer_info, customer_style))
    elements.append(Spacer(1, 20))

    # Order Details Table
    table_data = [['Item', 'Quantity', 'Price', 'Print Cost']]
    order_details = notification.order_details
    if isinstance(order_details, str):
        import json
        order_details = json.loads(order_details)
    
    for item in order_details.get('items', []):
        if item.get('printedVersion'):
            table_data.append([
                item['name'],
                str(item['quantity']),
                f"${item.get('price', 0):,.2f}",
                f"${item.get('print_cost', 0):,.2f}"
            ])

    table = Table(table_data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(table)
    elements.append(Spacer(1, 20))

    # Total
    total_style = ParagraphStyle(
        'Total',
        parent=styles['Normal'],
        fontSize=14,
        spaceAfter=20,
        alignment=2  # Right alignment
    )
    elements.append(Paragraph(f"<b>Total Print Cost: ${notification.total_print_cost}</b>", total_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer

@app.route('/api/print-notifications/<int:notification_id>/pdf', methods=['GET'])
def get_print_notification_pdf(notification_id):
    try:
        notification = PrintNotification.query.get_or_404(notification_id)
        buffer = generate_print_notification_pdf(notification)

        response = make_response(buffer.getvalue())
        response.headers['Content-Type'] = 'application/pdf'
        filename = f"print_notification_{notification.invoice_number}.pdf"
        response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except Exception as e:
        print(f"Error generating PDF: {str(e)}")  # Add logging for debugging
        return jsonify({'error': str(e)}), 500

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
        data = request.json
        
        # Mock customer data for now
        customer_details = {
            'name': 'John Doe',
            'email': 'john.doe@example.com',
            'phone': '+1 (555) 123-4567'
        }
        
        # Calculate totals
        total_print_cost = sum(
            item.get('print_cost', 0) * item.get('quantity', 1)
            for item in data['items']
            if item.get('printedVersion')
        )
        
        subtotal = sum(
            item.get('price', 0) * item.get('quantity', 1)
            for item in data['items']
        )
        
        discount_percent = float(data.get('discountPercent', 0))
        total = subtotal + total_print_cost
        discount_amount = total * discount_percent
        final_total = total - discount_amount
        
        # Generate invoice number
        invoice_number = generate_invoice_number()
        
        # Create new order
        order = Order(
            invoice_number=invoice_number,
            total_amount=final_total,
            customer_name=customer_details['name'],
            customer_email=customer_details['email']
        )
        db.session.add(order)
        db.session.commit()
        
        # Check for printed items
        has_printed_items = any(item.get('printedVersion') for item in data['items'])
        if has_printed_items:
            data['printCost'] = total_print_cost
            data['invoiceNumber'] = invoice_number
            send_print_notification(data, customer_details)
        
        # Generate invoice PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []

        # Title and Invoice Number
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=10
        )
        elements.append(Paragraph("Invoice", title_style))
        elements.append(Paragraph(f"Invoice #: {invoice_number}", styles['Normal']))
        elements.append(Spacer(1, 20))

        # Customer Details
        customer_style = ParagraphStyle(
            'CustomerInfo',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=20
        )
        customer_info = f"""
        <b>Customer Details:</b><br/>
        Name: {customer_details['name']}<br/>
        Email: {customer_details['email']}<br/>
        Phone: {customer_details['phone']}<br/>
        Order Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        """
        elements.append(Paragraph(customer_info, customer_style))
        elements.append(Spacer(1, 20))

        # Order Details Table
        table_data = [['Item', 'Quantity', 'Price', 'Print Cost', 'Total']]
        
        for item in data['items']:
            quantity = item.get('quantity', 1)
            price = item.get('price', 0) * quantity
            print_cost = item.get('print_cost', 0) * quantity if item.get('printedVersion') else 0
            total = price + print_cost
            
            table_data.append([
                item.get('name', ''),
                str(quantity),
                f"${price:,.2f}",
                f"${print_cost:,.2f}",
                f"${total:,.2f}"
            ])

        # Create and style the table
        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(table)
        elements.append(Spacer(1, 20))

        # Add totals
        elements.append(Paragraph(f"<b>Subtotal:</b> ${subtotal:,.2f}", styles['Normal']))
        elements.append(Paragraph(f"<b>Total Print Cost:</b> ${total_print_cost:,.2f}", styles['Normal']))
        if discount_percent > 0:
            elements.append(Paragraph(f"<b>Discount ({int(discount_percent * 100)}%):</b> -${discount_amount:,.2f}", styles['Normal']))
        elements.append(Paragraph(f"<b>Total:</b> ${final_total:,.2f}", styles['Normal']))

        # Build PDF
        doc.build(elements)
        buffer.seek(0)

        # Create response with PDF
        response = make_response(buffer.getvalue())
        response.headers['Content-Type'] = 'application/pdf'
        filename = f"invoice_{invoice_number}.pdf"
        response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        response.headers['X-Filename'] = filename
        
        return response
        
    except Exception as e:
        print(f"Error generating invoice: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings', methods=['GET', 'PUT'])
def handle_settings():
    if request.method == 'GET':
        email_settings = EmailSettings.query.first()
        return jsonify({
            'notification_email': email_settings.notification_email,
            'smtp_server': email_settings.smtp_server,
            'smtp_port': email_settings.smtp_port,
            'smtp_username': email_settings.smtp_username,
            'smtp_use_tls': bool(email_settings.smtp_use_tls)
        })
    
    elif request.method == 'PUT':
        data = request.json
        email_settings = EmailSettings.query.first()
        email_settings.notification_email = data['notification_email']
        email_settings.smtp_server = data['smtp_server']
        email_settings.smtp_port = data['smtp_port']
        email_settings.smtp_username = data['smtp_username']
        email_settings.smtp_password = data.get('smtp_password', email_settings.smtp_password)
        email_settings.smtp_use_tls = data['smtp_use_tls']
        db.session.commit()
        return jsonify({'message': 'Settings updated successfully'})

@app.route('/api/seed', methods=['POST'])
def seed_database():
    try:
        # Drop all tables and recreate them
        db.drop_all()
        db.create_all()

        # Initialize schema version
        update_schema_version()

        # Initialize email settings
        email_settings = EmailSettings(
            notification_email='admin@example.com',
            smtp_server='smtp.gmail.com',
            smtp_port=587,
            smtp_username='your_email@gmail.com',
            smtp_password='your_app_password',
            smtp_use_tls=True
        )
        db.session.add(email_settings)

        # Initialize discount settings
        discount_settings = DiscountSettings(
            tier1_quantity=5,
            tier1_discount=0.05,
            tier2_quantity=10,
            tier2_discount=0.10
        )
        db.session.add(discount_settings)

        # Add sample movie props
        seed_sample_data()
        
        return jsonify({'message': 'Database seeded successfully'}), 200
    except Exception as e:
        print(f"Error seeding database: {str(e)}")
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
    initialize_database()
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'production') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
