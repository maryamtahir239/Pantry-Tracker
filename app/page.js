'use client'
import React, {useState, useEffect, useRef} from "react";
import { collection, addDoc, getDoc, querySnapshot, query, onSnapshot,
   collectionGroup, sum, deleteDoc, doc, updateDoc} from "firebase/firestore";
import {db} from './firebase';
import { Camera } from "react-camera-pro";
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as tf from '@tensorflow/tfjs';
tf.ENV.set('DEBUG', false);
import axios from "axios";

const SPOONACULAR_API_KEY = '2cb440fcc30a49968b2f8705f9fa3b68';

export default function Home() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({name:'', quantity: ''})
  const [total, setTotal] = useState(0)
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const camera = useRef(null);
  const [model, setModel] = useState(null);


  useEffect(() => {
    const loadModel = async () => {
      const loadedModel = await mobilenet.load();
      setModel(loadedModel);
    };
    loadModel();
  }, []);

  const addItem = async (e) => {
    e.preventDefault();
    if (newItem.name !== '' && newItem.quantity !== '') {
      if (editingItem) {
        await updateDoc(doc(db, 'items', editingItem.id), {
          name: newItem.name.trim(),
          quantity: newItem.quantity,
        });
        setEditingItem(null);
      } else {
        await addDoc(collection(db, 'items'), {
          name: newItem.name.trim(),
          quantity: newItem.quantity,
        });
      }
      setNewItem({ name: '', quantity: '' });
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'items'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let itemsArr = [];
      querySnapshot.forEach((doc) => {
        itemsArr.push({...doc.data(), id: doc.id });
      });
      setItems(itemsArr);

     const calculateTotal = () =>{
      const totalQuantity = itemsArr.reduce(
        (sum, item) => sum + parseFloat(item.quantity),
        0
      );
      setTotal(totalQuantity);
     };
     calculateTotal();
     return () =>unsubscribe();

    });
  }, []);

  const deleteItem = async (item) =>{
    if(item.quantity> 1){
      await updateDoc(doc (db, 'items', item.id), {
        quantity: item.quantity - 1,
      });
    } else{
      await deleteDoc(doc(db, 'items', item.id));
    }
    
  };

  const editItem = (item) => {
    setNewItem({ name: item.name, quantity: item.quantity });
    setEditingItem(item);
  };
  const captureItem = async () => {
    if (!model) {
      console.error('Model is not loaded yet.');
      return;
    }
  
    const image = camera.current.takePhoto();
    if (image) {
      const detectedItem = await recognizeItemFromImage(image);
      setNewItem({ ...newItem, name: detectedItem });
      setShowCamera(false);
    } else {
      console.error('Failed to capture image.');
    }
  };

  const recognizeItemFromImage = async (image) => {
    if (!model) {
      console.error('Model is not loaded yet.');
      return 'Unknown';
    }
  
    try {
      const imgElement = document.createElement('img');
      imgElement.src = image;
      await new Promise((resolve) => imgElement.onload = resolve);
      
      const tensor = tf.browser.fromPixels(imgElement);
      const predictions = await model.classify(tensor);
  
      if (predictions.length > 0) {
        return predictions[0].className;
      } else {
        return 'Unknown';
      }
    } catch (error) {
      console.error('Error during image recognition:', error);
      return 'Unknown';
    }
  };

  const fetchRecipes = async () => {
    const ingredients = items.map(item => item.name).join(',');
    try {
      const response = await axios.get(`https://api.spoonacular.com/recipes/findByIngredients`, {
        params: {
          ingredients,
          number: 5,
          apiKey: SPOONACULAR_API_KEY,
        }
      });
      setRecipes(response.data);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-between sm:p-24 p-4 text-white bg-black">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm ">
        <h1 className="text-4xl p-4 mb-5 text-center">Pantry Tracker</h1>
        <div className="flex justify-center">
          <button
            onClick={() => {
              if (!showCamera) {
                setShowCamera(true);
              } else {
                captureItem();
              }
            }}
            className="col-span-3 p-3 mb-4 border rounded-lg bg-slate-950 hover:bg-slate-900 text-white">
            {showCamera ? "Capture item " : "Open Camera"}
          </button>
        </div>
          {showCamera && (
          <div className="flex flex-col items-center mb-4">
            <div className="camera-container" style={{ width: '300px', height: '200px' }}>
              <Camera ref={camera} aspectRatio={16 / 9} />
            </div>
          </div>
        )}
        <div className="flex justify-center items-center mb-4">
          <input
            type="text"
            placeholder="Search items"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='col-span-3 p-3 w-full border rounded-lg bg-slate-950 hover:bg-slate-900 text-white' 
          />
        </div>
        <div className="bg bg-slate-800 p-4 rounded-lg">
          <form className="grid grid-cols-6 items-center text-black">
            <input
            value={newItem.name}
            onChange={(e) => setNewItem({...newItem, name: e.target.value})}
            className='col-span-3 p-3 '  type="text" placeholder="Enter item" />
            <input value={newItem.quantity}
            onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
             className='col-span-2 p-3 border mx-2 ' type="text" placeholder=" Quantity" />
            <button 
            onClick={addItem}
            className="text-white bg-slate-950 hover:bg-slate-900  border mx-1 p-2 text-xl" type="submit">
              +
              </button>
          </form>
          <ul>
          {filteredItems.map((item, id) =>(
              <li key={id} className="my-4 w-full flex justify-between bg-slate-950"> 
                <div className="p-4 w-full flex justify-between">
                  <span className="capitalize">{item.name}</span>
                  <span>{item.quantity}</span>
                </div>
              <button onClick={() => editItem(item)}
                  className="ml-2 p-4 border-l-2 border-slate-900  flex items-center justify-center ">Edit</button>
              <button onClick={() => deleteItem(item)}
              className="ml-2 p-4 w-20 border-l-2 border-slate-900 flex items-center justify-center">X</button>
            </li>
            ))}
          </ul>
          {items.length < 1 ? ('') : (
            <div className=" flex justify-between p-3">
              <span>Total Items</span>
              <span>{total}</span>
            </div>
          )}
        </div>
        <div className="flex justify-center mt-4">
          <button 
            onClick={fetchRecipes}
            className="col-span-3 p-3 mb-3 mt-8 border rounded-lg bg-slate-950 hover:bg-slate-900 text-white">
            Get Recipe Suggestions
          </button>
        </div>
        <div className="bg bg-slate-800 p-4 rounded-lg mt-4">
          <h2 className="text-2xl mb-4">Recipe Suggestions</h2>
          {recipes.length > 0 ? (
            <ul>
            {recipes.map((recipe, index) => (
              <li key={index} className="my-4 w-full flex justify-between bg-slate-950">
                <div className="p-4 w-full flex justify-between">
                  <span className="capitalize">{recipe.title}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No recipes found.</p>
        )}
      </div>
    </div>
  </main>
);
}