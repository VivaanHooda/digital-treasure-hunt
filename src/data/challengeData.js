// Solution 1: Create a unified challengeData.js that dynamically imports based on admin selection

// 1. First, rename your existing files:
// challengeData.js → challengeDataSetA.js  
// challengeData(2).js → challengeDataSetB.js

// 2. Create a new challengeData.js as the main interface:

// src/data/challengeData.js
import { CHALLENGES_SET_A as SET_A, getChallengesForUser as getChallengesForUserA, getChallengeById as getChallengeByIdA } from './challengeDataSetA'
import { CHALLENGES_SET_B as SET_B, getChallengeById as getChallengeByIdB } from './challengeDataSetB'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

// Cache for current dataset selection
let currentDataSet = 'A'
let isDataSetLoaded = false

// Load the current dataset selection from Firebase
const loadDataSetSelection = async () => {
  try {
    const docRef = doc(db, 'gameSettings', 'challengeDataSet')
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      currentDataSet = docSnap.data().selectedSet || 'A'
    } else {
      // Create default selection
      await setDoc(docRef, { selectedSet: 'A' })
    }
    isDataSetLoaded = true
    console.log('Current challenge dataset:', currentDataSet)
  } catch (error) {
    console.error('Error loading dataset selection:', error)
    currentDataSet = 'A' // Fallback to Set A
    isDataSetLoaded = true
  }
}

// Initialize dataset loading
loadDataSetSelection()

// Wait for dataset to be loaded
const waitForDataSet = async () => {
  while (!isDataSetLoaded) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

// Public API functions that route to the correct dataset
export const getChallengesForUser = async (userId) => {
  await waitForDataSet()
  
  if (currentDataSet === 'B') {
    // Set B doesn't have user-specific shuffling, just return the challenges
    return SET_B.map((challenge, index) => ({
      ...challenge,
      id: index
    }))
  } else {
    return getChallengesForUserA(userId)
  }
}

export const getChallengeById = async (id, userId = null) => {
  await waitForDataSet()
  
  if (currentDataSet === 'B') {
    return getChallengeByIdB(id)
  } else {
    return getChallengeByIdA(id, userId)
  }
}

// Admin function to switch datasets
export const switchChallengeDataSet = async (newSet) => {
  try {
    const docRef = doc(db, 'gameSettings', 'challengeDataSet')
    await setDoc(docRef, { selectedSet: newSet })
    currentDataSet = newSet
    console.log('Challenge dataset switched to:', newSet)
    return true
  } catch (error) {
    console.error('Error switching dataset:', error)
    return false
  }
}

// Get current dataset
export const getCurrentDataSet = async () => {
  await waitForDataSet()
  return currentDataSet
}

// Export constants for backward compatibility
export const CHALLENGES_SET_A = SET_A
export const CHALLENGES_SET_B = SET_B