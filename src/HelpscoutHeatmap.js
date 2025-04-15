import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import TeamMemberView from './TeamMemberView';
import UserWeeklyView from './UserWeeklyView';

// File Upload Component
const FileUpload = ({ onFileLoaded }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsLoading(true);
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const csvData = event.target.result;
        onFileLoaded(csvData);
        setIsLoading(false);
      };
      
      reader.onerror = () => {
        console.error('Error reading file');
        setIsLoading(false);
      };
      
      reader.readAsText(file);
    }
  };

  return (
    <div className="file-upload mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Upload Helpscout CSV File:
      </label>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-md file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100"
      />
      {isLoading && <p className="mt-2 text-sm text-gray-500">Loading file...</p>}
    </div>
  );
};

const HelpscoutHeatmap = () => {
  // State management
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [data, setData] = useState([]);
  const [heatmapData, setHeatmapData] = useState({});
  const [uniqueEmails, setUniqueEmails] = useState([]);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedEmail, setSelectedEmail] = useState('all');
  const [availableDates, setAvailableDates] = useState([]);
  const [minDate, setMinDate] = useState('');
  const [maxDate, setMaxDate] = useState('');
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [viewMode, setViewMode] = useState('hourly'); // 'hourly', 'team', or 'user'

  // Color scale for heatmap (from light to dark blue)
  const getColor = (value, max) => {
    if (value === 0) return '#f5f5f5';
    const intensity = Math.min(Math.max(Math.floor((value / max) * 9), 1), 9);
    return `rgba(33, 150, 243, 0.${intensity})`;
  };

  // Handle file upload
  const handleFileLoaded = (csvData) => {
    setLoading(true);
    
    Papa.parse(csvData, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimitersToGuess: [',', '\t', '|', ';'],
      complete: (results) => {
        // Check if required columns exist
        const hasCreatedAt = results.meta.fields.includes('created_at_est');
        const hasUserEmail = results.meta.fields.includes('user_email');
        
        if (!hasCreatedAt || !hasUserEmail) {
          alert('CSV file must contain created_at_est and user_email columns');
          setLoading(false);
          return;
        }
        
        // Filter to only include rows with user_email (support team responses)
        const supportResponses = results.data.filter(row => row.user_email !== null);
        
        // Process the data
        const processedData = supportResponses.map(row => {
          const dateTime = new Date(row.created_at_est);
          return {
            email: row.user_email,
            date: dateTime.toISOString().split('T')[0], // YYYY-MM-DD
            dayOfWeek: dateTime.getDay(), // 0-6 (Sunday-Saturday)
            dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateTime.getDay()],
            hour: dateTime.getHours(),
            timestamp: dateTime.getTime()
          };
        });
        
        // Get unique emails and dates
        const emails = Array.from(new Set(processedData.map(row => row.email))).filter(email => email);
        const dates = processedData.map(row => row.date);
        const min = dates.length > 0 ? dates.reduce((a, b) => a < b ? a : b) : '';
        const max = dates.length > 0 ? dates.reduce((a, b) => a > b ? a : b) : '';
        
        // Group dates by week for selection dropdown
        const weekGroups = _.groupBy(
          _.uniq(dates).sort(), 
          date => {
            const d = new Date(date);
            // Get the Sunday of the week
            const day = d.getDay();
            const diff = d.getDate() - day;
            const sunday = new Date(d.setDate(diff));
            return sunday.toISOString().split('T')[0];
          }
        );
        
        const weekOptions = Object.keys(weekGroups).map(weekStart => {
          const lastDay = weekGroups[weekStart][weekGroups[weekStart].length - 1];
          return {
            value: `${weekStart}|${lastDay}`,
            label: `${weekStart} to ${lastDay}`
          };
        });
        
        // Set state
        setData(processedData);
        setUniqueEmails(emails);
        setDateRange({ start: min, end: max });
        setAvailableDates([...new Set(dates)].sort());
        setMinDate(min);
        setMaxDate(max);
        setWeeks(weekOptions);
        setSelectedWeek(weekOptions.length > 0 ? weekOptions[weekOptions.length - 1].value : '');
        setDataLoaded(true);

        // Initial filter
        filterData(processedData, emails, { start: min, end: max }, 'all');
        setLoading(false);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        setLoading(false);
      }
    });
  };

  // Handle week selection
  useEffect(() => {
    if (selectedWeek && data.length > 0) {
      const [start, end] = selectedWeek.split('|');
      filterData(data, uniqueEmails, { start, end }, selectedEmail);
    }
  }, [selectedWeek, selectedEmail]);

  // Filter data based on selected email and date range
  const filterData = (processedData, emails, range, email) => {
    // Filter by date range and email if specified
    const filtered = processedData.filter(row => {
      const dateInRange = row.date >= range.start && row.date <= range.end;
      const emailMatch = email === 'all' || row.email === email;
      return dateInRange && emailMatch;
    });
    
    // Group by day and hour
    const heatmap = {};
    
    // Initialize the structure
    for (let day = 0; day < 7; day++) {
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
      heatmap[dayName] = {};
      
      for (let hour = 0; hour < 24; hour++) {
        heatmap[dayName][hour] = {
          total: 0,
          byEmail: {}
        };
        
        // Initialize counts for each email
        emails.forEach(email => {
          heatmap[dayName][hour].byEmail[email] = 0;
        });
      }
    }
    
    // Populate the heatmap data
    filtered.forEach(row => {
      const { dayName, hour, email } = row;
      
      if (email) {
        heatmap[dayName][hour].total += 1;
        heatmap[dayName][hour].byEmail[email] = (heatmap[dayName][hour].byEmail[email] || 0) + 1;
      }
    });
    
    setHeatmapData(heatmap);
  };

  // Find the maximum value for color scaling
  const findMaxValue = () => {
    if (!heatmapData[selectedDay]) return 1;
    
    return Math.max(
      1,
      ...Object.values(heatmapData[selectedDay]).map(hourData => 
        selectedEmail === 'all' ? hourData.total : hourData.byEmail[selectedEmail] || 0
      )
    );
  };

  // Format hour for display
  const formatHour = (hour) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h} ${ampm}`;
  };

  // Get cell value based on selected email
  const getCellValue = (dayData, hour) => {
    if (!dayData[hour]) return 0;
    return selectedEmail === 'all' ? dayData[hour].total : dayData[hour].byEmail[selectedEmail] || 0;
  };

  // Handle email selection change
  const handleEmailChange = (e) => {
    setSelectedEmail(e.target.value);
    // If switching to user view, ensure a specific email is selected
    if (viewMode === 'user' && e.target.value === 'all') {
      // If selecting 'all' in user view, switch back to hourly view
      setViewMode('hourly');
    }
  };

  // Handle week selection change
  const handleWeekChange = (e) => {
    setSelectedWeek(e.target.value);
  };

  // Handle view mode change
  const handleViewModeChange = (mode) => {
    // If switching to user view, ensure a specific email is selected
    if (mode === 'user' && selectedEmail === 'all') {
      alert('Please select a specific team member to view their weekly pattern.');
      return;
    }
    setViewMode(mode);
  };

  // Loading state
  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const maxValue = findMaxValue();

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Support Team Response Heatmap</h1>
      
      {!dataLoaded ? (
        <div className="mb-6">
          <p className="mb-4">
            Upload a CSV file with support team responses data. The file must include:
          </p>
          <ul className="list-disc ml-6 mb-4">
            <li><strong>created_at_est</strong> - Timestamp of when the response was sent (format: YYYY-MM-DDTHH:MM:SS)</li>
            <li><strong>user_email</strong> - Email of the support representative who sent the response</li>
          </ul>
          <FileUpload onFileLoaded={handleFileLoaded} />
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Week Range:</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={selectedWeek}
                onChange={handleWeekChange}
              >
                {weeks.map((week, index) => (
                  <option key={index} value={week.value}>
                    {week.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Support Rep:</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={selectedEmail}
                onChange={handleEmailChange}
                disabled={viewMode === 'team'}
              >
                <option value="all" disabled={viewMode === 'user'}>All Team Members</option>
                {uniqueEmails.map((email, index) => (
                  <option key={index} value={email}>
                    {email.split('@')[0]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">View Mode:</label>
              <div className="flex border border-gray-300 rounded-md overflow-hidden">
                <button
                  className={`flex-1 py-2 px-4 focus:outline-none ${
                    viewMode === 'hourly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => handleViewModeChange('hourly')}
                >
                  Hourly
                </button>
                <button
                  className={`flex-1 py-2 px-4 focus:outline-none ${
                    viewMode === 'team'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => handleViewModeChange('team')}
                >
                  Team
                </button>
                <button
                  className={`flex-1 py-2 px-4 focus:outline-none ${
                    viewMode === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => handleViewModeChange('user')}
                >
                  User Week
                </button>
              </div>
            </div>
          </div>
          
          {/* Day tabs - Only show for hourly and team views */}
          {viewMode !== 'user' && (
            <div className="mb-4 border-b border-gray-200">
              <ul className="flex flex-wrap -mb-px">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <li key={day} className="mr-2">
                    <button
                      className={`inline-block p-4 ${
                        selectedDay === day
                          ? 'text-blue-600 border-b-2 border-blue-600 rounded-t-lg active'
                          : 'border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedDay(day)}
                    >
                      {day}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Heatmap Legend */}
          <div className="flex items-center mb-4">
            <div className="mr-2 text-sm font-medium text-gray-500">Low</div>
            <div className="flex h-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((intensity) => (
                <div
                  key={intensity}
                  style={{
                    backgroundColor: `rgba(33, 150, 243, 0.${intensity})`,
                    width: '20px',
                    height: '16px'
                  }}
                ></div>
              ))}
            </div>
            <div className="ml-2 text-sm font-medium text-gray-500">High</div>
          </div>
          
          {/* View Content */}
          {viewMode === 'hourly' && (
            // Hourly View
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="p-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hour
                    </th>
                    <th className="p-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responses
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <tr key={hour}>
                      <td className="p-3 border-b border-gray-200 text-sm">
                        {formatHour(hour)}
                      </td>
                      <td className="p-3 border-b border-gray-200">
                        <div
                          className="p-3 rounded-md text-center font-medium"
                          style={{
                            backgroundColor: getColor(
                              getCellValue(heatmapData[selectedDay] || {}, hour),
                              maxValue
                            ),
                            color: getCellValue(heatmapData[selectedDay] || {}, hour) > maxValue * 0.6 ? 'white' : 'black'
                          }}
                        >
                          {getCellValue(heatmapData[selectedDay] || {}, hour)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {viewMode === 'team' && (
            // Team Member View
            <TeamMemberView 
              heatmapData={heatmapData} 
              uniqueEmails={uniqueEmails} 
              selectedDay={selectedDay}
              getColor={getColor}
            />
          )}
          
          {viewMode === 'user' && (
            // User Weekly View
            <UserWeeklyView 
              heatmapData={heatmapData}
              selectedEmail={selectedEmail}
              getColor={getColor}
            />
          )}
          
          {/* Summary stats */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h2 className="text-lg font-medium mb-2">Data Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Date Range</p>
                <p className="font-medium">{dateRange.start} to {dateRange.end}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Team Members</p>
                <p className="font-medium">{uniqueEmails.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Responses</p>
                <p className="font-medium">{data.length}</p>
              </div>
            </div>
          </div>
          
          {/* Upload new file button */}
          <div className="mt-4">
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => setDataLoaded(false)}
            >
              Upload Different File
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default HelpscoutHeatmap;