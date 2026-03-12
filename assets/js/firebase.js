import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { firebaseConfig } from "./env.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);
const auth = getAuth(app);
const EMPLOYEES_COLLECTION = 'employees';

export { db, auth };

export async function getEmployeesFromDB() {
    try {
        const querySnapshot = await getDocs(collection(db, EMPLOYEES_COLLECTION));
        const employees = [];
        querySnapshot.forEach((doc) => {
            employees.push({ id: doc.id, ...doc.data() });
        });
        
        return employees;
    } catch (e) {
        console.error("Error fetching employees: ", e);
        return [];
    }
}

export async function saveSingleEmployeeToDB(emp) {
    try {
        await setDoc(doc(db, EMPLOYEES_COLLECTION, emp.id), emp);
    } catch (e) {
        console.error("Error saving document: ", e);
    }
}

export async function saveEmployeesToDB(employeesArray) {
    try {
        // Run all saves concurrently
        const savePromises = employeesArray.map(emp => saveSingleEmployeeToDB(emp));
        await Promise.all(savePromises);
    } catch (e) {
        console.error("Error saving employees array: ", e);
    }
}

export async function deleteEmployeeFromDB(empId) {
    try {
        await deleteDoc(doc(db, EMPLOYEES_COLLECTION, empId));
    } catch (e) {
        console.error("Error deleting employee: ", e);
        throw e;
    }
}

export function generateId() {
    return Math.random().toString(36).substr(2, 9);
}
