# Q-Learning Grid Navigation

A **Q-learning** agent playground for 10×10 grid navigation built with React 19 and Vite.

#### Backend Available here ⬇️

[https://github.com/CheraHamza/QLearningGridNavigation-Backend](https://github.com/CheraHamza/QLearningGridNavigation-Backend)

## Overview

The agent uses a Q-learning model to navigate a grid world — moving from a start position to a target while avoiding obstacles and visiting checkpoints. The environment provides real-time feedback and interactive editing capabilities.

## Features

- **Visual grid representation** — see the agent, goal, obstacles, and checkpoints
- **Interactive editing** — click to add/remove obstacles and checkpoints
- **Manual control** — move the agent with arrow keys or the D-pad
- **AI agent** — let the Q-learning agent choose actions via the backend
- **Turbo training** — run batches of training episodes server-side
- **Episode history** — step-by-step action & reward log

## Tech Stack

| Layer   | Technology   |
| ------- | ------------ |
| UI      | React 19     |
| Bundler | Vite 7       |
| Icons   | lucide-react |
| deploy  | netlify      |
