CREATE DATABASE clinic_db;
USE clinic_db;


CREATE TABLE clinic (
    clinic_id INT PRIMARY KEY AUTO_INCREMENT,
    clinic_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15),
    street_address VARCHAR(150),
    city VARCHAR(50),
    state VARCHAR(50),
    zip_code VARCHAR(10)
);


CREATE TABLE department (
    department_id INT PRIMARY KEY AUTO_INCREMENT,
    department_name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    clinic_id INT NOT NULL,
    FOREIGN KEY (clinic_id) REFERENCES clinic(clinic_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


CREATE TABLE office (
    office_id INT PRIMARY KEY AUTO_INCREMENT,
    clinic_id INT NOT NULL,
    phone_number VARCHAR(15),
    street_address VARCHAR(150),
    city VARCHAR(50),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    FOREIGN KEY (clinic_id) REFERENCES clinic(clinic_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


CREATE TABLE physician (
    physician_id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone_number VARCHAR(15),
    specialty VARCHAR(100),
    department_id INT,
    hire_date DATE,
    FOREIGN KEY (department_id) REFERENCES department(department_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);


CREATE TABLE work_schedule (
    schedule_id INT PRIMARY KEY AUTO_INCREMENT,
    physician_id INT NOT NULL,
    office_id INT NOT NULL,
    day_of_week VARCHAR(10),
    start_time TIME,
    end_time TIME,
    FOREIGN KEY (physician_id) REFERENCES physician(physician_id)
        ON DELETE CASCADE,
    FOREIGN KEY (office_id) REFERENCES office(office_id)
        ON DELETE CASCADE
);


CREATE TABLE insurance (
    insurance_id INT PRIMARY KEY AUTO_INCREMENT,
    provider_name VARCHAR(100) NOT NULL,
    policy_number VARCHAR(50) NOT NULL,
    coverage_percentage DECIMAL(5,2),
    group_number VARCHAR(50),
    phone_number VARCHAR(20)
);


CREATE TABLE patient (
    patient_id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE,
    phone_number VARCHAR(15),
    email VARCHAR(100),
    street_address VARCHAR(150),
    city VARCHAR(50),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    gender VARCHAR(20),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(15),
    primary_physician_id INT NOT NULL,
    insurance_id INT NOT NULL,
    FOREIGN KEY (primary_physician_id) REFERENCES physician(physician_id),
    FOREIGN KEY (insurance_id) REFERENCES insurance(insurance_id)
);


CREATE TABLE appointment_status (
    status_id INT PRIMARY KEY AUTO_INCREMENT,
    status_name VARCHAR(20)
);


CREATE TABLE appointment (
    appointment_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    physician_id INT NOT NULL,
    office_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status_id INT NOT NULL,
    booking_method VARCHAR(20),
    reason_for_visit VARCHAR(255),
    UNIQUE (physician_id, appointment_date, appointment_time),
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id),
    FOREIGN KEY (physician_id) REFERENCES physician(physician_id),
    FOREIGN KEY (office_id) REFERENCES office(office_id),
    FOREIGN KEY (status_id) REFERENCES appointment_status(status_id)
);


CREATE TABLE medical_history (
    medical_history_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    `condition` VARCHAR(50),
    diagnosis_date DATE NOT NULL,
    status VARCHAR(20),
    notes VARCHAR(350),
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
        ON DELETE CASCADE
);


CREATE TABLE diagnosis (
    diagnosis_id INT PRIMARY KEY AUTO_INCREMENT,
    appointment_id INT NOT NULL,
    physician_id INT NOT NULL,
    diagnosis_code VARCHAR(10),
    diagnosis_description VARCHAR(255),
    diagnosis_date DATE NOT NULL,
    severity VARCHAR(20),
    notes TEXT,
    FOREIGN KEY (appointment_id) REFERENCES appointment(appointment_id)
        ON DELETE CASCADE,
    FOREIGN KEY (physician_id) REFERENCES physician(physician_id)
);


CREATE TABLE treatment (
    treatment_id INT PRIMARY KEY AUTO_INCREMENT,
    diagnosis_id INT NOT NULL,
    treatment_plan TEXT,
    prescribed_medication VARCHAR(255),
    follow_up_date DATE,
    notes TEXT,
    FOREIGN KEY (diagnosis_id) REFERENCES diagnosis(diagnosis_id)
        ON DELETE CASCADE
);


CREATE TABLE referral_status (
    referral_status_id INT PRIMARY KEY AUTO_INCREMENT,
    referral_status_name VARCHAR(20)
);


CREATE TABLE referral (
    referral_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    primary_physician_id INT NOT NULL,
    specialist_id INT NOT NULL,
    date_issued DATE,
    expiration_date DATE,
    referral_status_id INT NOT NULL,
    referral_reason VARCHAR(255),
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id),
    FOREIGN KEY (primary_physician_id) REFERENCES physician(physician_id),
    FOREIGN KEY (specialist_id) REFERENCES physician(physician_id),
    FOREIGN KEY (referral_status_id) REFERENCES referral_status(referral_status_id)
);


CREATE TABLE staff (
    staff_id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    date_of_birth DATE,
    department_id INT,
    role VARCHAR(50),
    hire_date DATE,
    phone_number VARCHAR(15),
    email VARCHAR(100),
    shift_start TIME,
    shift_end TIME,
    FOREIGN KEY (department_id) REFERENCES department(department_id)
        ON DELETE SET NULL
);


CREATE TABLE billing (
    bill_id INT PRIMARY KEY AUTO_INCREMENT,
    appointment_id INT NOT NULL,
    patient_id INT NOT NULL,
    insurance_id INT,
    total_amount DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    payment_status VARCHAR(20),
    payment_method VARCHAR(30),
    payment_date DATE,
    FOREIGN KEY (appointment_id) REFERENCES appointment(appointment_id),
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id),
    FOREIGN KEY (insurance_id) REFERENCES insurance(insurance_id)
);
