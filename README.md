# Support Team Response Heatmap Dashboard

A React-based dashboard to visualize when customer support responses are being sent by individual team members. This dashboard allows you to upload your Helpscout CSV data and analyze response patterns across days of the week and hours of the day.

## Features

- Upload and analyze Helpscout response data
- Filter by week range
- Filter by support representative
- View data for each day of the week (Monday through Sunday)
- Heat map visualization with color intensity indicating response volume
- Simple data summary statistics

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or newer)
- npm (comes with Node.js)

## Setup Instructions

1. Clone or download this repository to your local machine

2. Navigate to the project directory in your terminal:
   ```bash
   cd support-heatmap-dashboard
   ```

3. Install the dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) to view the dashboard in your browser

## Using the Dashboard

1. Export your Helpscout data as a CSV that includes at minimum:
   - `created_at_est` - Timestamp of when responses were sent (format: YYYY-MM-DDTHH:MM:SS)
   - `user_email` - Email of the support representative who sent the response

2. Use the file upload button on the dashboard to select your CSV file

3. Once uploaded, the dashboard will render with your data:
   - Use the week range selector to focus on specific time periods
   - Filter by individual support representatives or view all team data
   - Click on different day tabs to see response distribution for each day of the week

4. The color intensity in the heat map indicates response volume - darker blue represents more responses

## Building for Production

To build the app for production deployment:

```bash
npm run build
```

This creates a `build` folder with optimized production files that can be deployed to any static hosting service.

## Customization

- Modify colors and styles in `App.css`
- Adjust the heatmap visualization in `HelpscoutHeatmap.js`
- Change the day order or add additional metrics in `HelpscoutHeatmap.js`

## Project Structure

- `App.js` - Main application container
- `HelpscoutHeatmap.js` - The dashboard component with file upload and visualization 
- `App.css` - Styling for the application
- `package.json` - Project dependencies and scripts