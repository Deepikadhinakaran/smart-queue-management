import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, ArcElement,
  Title, Tooltip, Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const API = 'https://3i332hoxe7.execute-api.ap-south-1.amazonaws.com/prod';

const formatTime = (mins) => {
  const m = Math.round(parseFloat(mins));
  if (m <= 0) return '0 mins';
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h > 0 && rem > 0) return `${h}hr ${rem}mins`;
  if (h > 0) return `${h}hr`;
  return `${rem}mins`;
};

const getStatus = (mins) => {
  const m = parseFloat(mins);
  if (m <= 10) return { label: 'Short', bg: '#fef3c7', color: '#92400e' };
  if (m <= 30) return { label: 'Medium', bg: '#fed7aa', color: '#9a3412' };
  if (m <= 60) return { label: 'Long', bg: '#fecaca', color: '#991b1b' };
  return { label: 'Very Long', bg: '#fee2e2', color: '#7f1d1d' };
};

export default function App() {
  const [form, setForm] = useState({
    people: '', avg_time: '', queue_type: 'General',
    priority: 'Normal', counter: '1'
  });
  const [result, setResult]   = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [activeTab, setActiveTab] = useState('predict');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchHistory();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API}/history`);
      setHistory(res.data.records || []);
    } catch (e) { console.error(e); }
  };

  const handlePredict = async () => {
    if (!form.people || !form.avg_time) {
      setError('Please fill People and Service Time fields!');
      return;
    }
    if (parseInt(form.people) <= 0) {
      setError('Number of people must be greater than 0!');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/predict`, {
        people: parseInt(form.people),
        avg_time: parseFloat(form.avg_time)
      });
      setResult({ ...res.data, ...form });
      fetchHistory();
    } catch (e) {
      setError('Prediction failed. Check your connection!');
    }
    setLoading(false);
  };

  const totalPeople = history.reduce((s, h) => s + (parseInt(h.people) || 0), 0);
  const avgWait = history.length > 0
    ? (history.reduce((s, h) => s + parseFloat(h.predicted_time), 0) / history.length).toFixed(1)
    : 0;
  const maxWait = history.length > 0
    ? Math.max(...history.map(h => parseFloat(h.predicted_time))) : 0;
  const minWait = history.length > 0
    ? Math.min(...history.map(h => parseFloat(h.predicted_time))) : 0;

  const lineData = {
    labels: history.slice(0, 10).reverse().map((_, i) => `Q${i + 1}`),
    datasets: [{
      label: 'Wait Time (mins)',
      data: history.slice(0, 10).reverse().map(h => Math.round(parseFloat(h.predicted_time))),
      borderColor: '#ea580c',
      backgroundColor: 'rgba(234,88,12,0.1)',
      tension: 0.4, fill: true,
      pointBackgroundColor: '#ea580c', pointRadius: 5
    }]
  };

  const barData = {
    labels: history.slice(0, 6).map((_, i) => `Queue ${i + 1}`),
    datasets: [{
      label: 'People',
      data: history.slice(0, 6).map(h => parseInt(h.people)),
      backgroundColor: ['#f97316','#ea580c','#dc2626','#b45309','#d97706','#f59e0b'],
      borderRadius: 8
    }]
  };

  const doughnutData = {
    labels: ['Short', 'Medium', 'Long', 'Very Long'],
    datasets: [{
      data: [
        history.filter(h => parseFloat(h.predicted_time) <= 10).length,
        history.filter(h => parseFloat(h.predicted_time) > 10 && parseFloat(h.predicted_time) <= 30).length,
        history.filter(h => parseFloat(h.predicted_time) > 30 && parseFloat(h.predicted_time) <= 60).length,
        history.filter(h => parseFloat(h.predicted_time) > 60).length,
      ],
      backgroundColor: ['#fbbf24','#f97316','#ef4444','#991b1b'],
      borderWidth: 2
    }]
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.logo}>🏥</div>
          <div>
            <h1 style={s.headerTitle}>Smart Queue Management System</h1>
            <p style={s.headerSub}>Real-time Queue Prediction & Analytics</p>
          </div>
        </div>
        <div style={s.headerRight}>
          <div style={s.clockBox}>🕐 {currentTime.toLocaleTimeString()}</div>
          <div style={s.datebox}>📅 {currentTime.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}</div>
          <div style={s.onlineBadge}>🟢 System Active</div>
        </div>
      </div>

      <div style={s.statsRow}>
        {[
          { icon:'👥', val:totalPeople, label:'Total People Served', color:'#ea580c' },
          { icon:'⏱️', val:formatTime(avgWait), label:'Avg Wait Time', color:'#d97706' },
          { icon:'📊', val:history.length, label:'Total Predictions', color:'#b45309' },
          { icon:'🔺', val:formatTime(maxWait), label:'Max Wait Time', color:'#dc2626' },
          { icon:'🔻', val:formatTime(minWait), label:'Min Wait Time', color:'#16a34a' },
          { icon:'📋', val:history.length > 0 ? getStatus(avgWait).label : 'N/A', label:'Queue Status', color:'#9a3412' },
        ].map((stat, i) => (
          <div key={i} style={{...s.statCard, borderTop:`4px solid ${stat.color}`}}>
            <div style={s.statIcon}>{stat.icon}</div>
            <div style={{...s.statNum, color:stat.color}}>{stat.val}</div>
            <div style={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={s.tabRow}>
        {['predict','history','analytics'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={activeTab === tab ? s.tabActive : s.tab}>
            {tab === 'predict' ? '🎯 Predict' : tab === 'history' ? '📋 History' : '📊 Analytics'}
          </button>
        ))}
      </div>

      {activeTab === 'predict' && (
        <div style={s.mainRow}>
          <div style={s.formCard}>
            <h2 style={s.cardTitle}>🎯 Queue Wait Time Predictor</h2>
            <p style={s.cardSub}>Fill in the details below to predict waiting time</p>
            <div style={s.formGrid}>
              <div>
                <label style={s.label}>👥 Number of People in Queue *</label>
                <input type="number" placeholder="e.g. 15" value={form.people}
                  onChange={e => setForm({...form, people:e.target.value})} style={s.input}/>
              </div>
              <div>
                <label style={s.label}>⏱ Avg Service Time per Person (mins) *</label>
                <input type="number" placeholder="e.g. 5" value={form.avg_time}
                  onChange={e => setForm({...form, avg_time:e.target.value})} style={s.input}/>
              </div>
              <div>
                <label style={s.label}>🏥 Queue Type</label>
                <select value={form.queue_type}
                  onChange={e => setForm({...form, queue_type:e.target.value})} style={s.input}>
                  <option>General</option>
                  <option>Emergency</option>
                  <option>OPD</option>
                  <option>Pharmacy</option>
                  <option>Lab Test</option>
                  <option>Billing</option>
                </select>
              </div>
              <div>
                <label style={s.label}>⚡ Priority Level</label>
                <select value={form.priority}
                  onChange={e => setForm({...form, priority:e.target.value})} style={s.input}>
                  <option>Normal</option>
                  <option>High</option>
                  <option>Critical</option>
                  <option>VIP</option>
                </select>
              </div>
              <div>
                <label style={s.label}>🪟 Counter Number</label>
                <select value={form.counter}
                  onChange={e => setForm({...form, counter:e.target.value})} style={s.input}>
                  {[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>📍 Location</label>
                <select style={s.input}>
                  <option>Ground Floor</option>
                  <option>First Floor</option>
                  <option>Second Floor</option>
                  <option>Emergency Wing</option>
                </select>
              </div>
            </div>
            {error && <p style={s.error}>⚠️ {error}</p>}
            <button onClick={handlePredict} style={s.btn} disabled={loading}>
              {loading ? '⏳ Calculating...' : '🚀 Predict Wait Time'}
            </button>
            <button onClick={() => { setForm({people:'',avg_time:'',queue_type:'General',priority:'Normal',counter:'1'}); setResult(null); setError(''); }} style={s.clearBtn}>
              🔄 Clear Form
            </button>
          </div>

          <div style={s.resultCard}>
            <h2 style={s.cardTitle}>📊 Prediction Result</h2>
            {result ? (
              <>
                <div style={s.resultBox}>
                  <p style={s.resultLabel}>Estimated Wait Time</p>
                  <div style={s.resultTime}>{formatTime(result.wait_time)}</div>
                  <p style={s.resultMins}>({Math.round(result.wait_time)} minutes total)</p>
                  <div style={{...s.statusBadge, background:getStatus(result.wait_time).bg, color:getStatus(result.wait_time).color}}>
                    {getStatus(result.wait_time).label} Wait
                  </div>
                </div>
                <div style={s.detailGrid}>
                  {[
                    {label:'Queue Type', val:result.queue_type, icon:'🏥'},
                    {label:'Priority', val:result.priority, icon:'⚡'},
                    {label:'Counter', val:`#${result.counter}`, icon:'🪟'},
                    {label:'People Ahead', val:result.people, icon:'👥'},
                    {label:'Service Time', val:`${result.avg_time} min/person`, icon:'⏱'},
                    {label:'Time', val:new Date().toLocaleTimeString(), icon:'🕐'},
                  ].map((d,i) => (
                    <div key={i} style={s.detailItem}>
                      <span style={s.detailIcon}>{d.icon}</span>
                      <div>
                        <div style={s.detailLabel}>{d.label}</div>
                        <div style={s.detailVal}>{d.val}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={s.tipBox}>
                  {parseFloat(result.wait_time) <= 10 ? '✅ Short wait! You can join the queue now.'
                    : parseFloat(result.wait_time) <= 30 ? '⚠️ Moderate wait. Grab a seat nearby.'
                    : parseFloat(result.wait_time) <= 60 ? '🔴 Long wait. Consider scheduling an appointment.'
                    : '⛔ Very long wait. Come back during off-peak hours.'}
                </div>
              </>
            ) : (
              <div style={s.emptyResult}>
                <div style={{fontSize:64}}>🎯</div>
                <p style={{color:'#9a3412', fontSize:16}}>Fill the form and click Predict to see results</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>📋 Queue History</h2>
          <p style={s.cardSub}>All {history.length} predictions recorded</p>
          <div style={{overflowX:'auto'}}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  {['#','People','Avg Time','Wait Time','Formatted','Status','Timestamp'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h,i) => {
                  const st = getStatus(h.predicted_time);
                  return (
                    <tr key={i} style={i%2===0 ? s.trEven : s.trOdd}>
                      <td style={s.td}>{i+1}</td>
                      <td style={s.td}>{h.people}</td>
                      <td style={s.td}>{h.avg_time} min</td>
                      <td style={s.td}><b>{Math.round(parseFloat(h.predicted_time))} min</b></td>
                      <td style={s.td}><b>{formatTime(h.predicted_time)}</b></td>
                      <td style={s.td}>
                        <span style={{...s.pill, background:st.bg, color:st.color}}>{st.label}</span>
                      </td>
                      <td style={s.td}>{h.timestamp?.slice(0,19).replace('T',' ')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {history.length === 0 &&
              <p style={{textAlign:'center', color:'#9a3412', padding:40}}>No records yet!</p>
            }
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <>
          <div style={s.mainRow}>
            <div style={s.card}>
              <h2 style={s.cardTitle}>📈 Wait Time Trend</h2>
              <Line data={lineData} options={{responsive:true}}/>
            </div>
            <div style={s.card}>
              <h2 style={s.cardTitle}>👥 People per Queue</h2>
              <Bar data={barData} options={{responsive:true}}/>
            </div>
          </div>
          <div style={{...s.mainRow, gridTemplateColumns:'1fr 2fr'}}>
            <div style={s.card}>
              <h2 style={s.cardTitle}>🍩 Wait Distribution</h2>
              <Doughnut data={doughnutData} options={{responsive:true}}/>
            </div>
            <div style={s.card}>
              <h2 style={s.cardTitle}>📊 Queue Summary</h2>
              <div style={s.summaryGrid}>
                {[
                  {label:'Total Queues', val:history.length, icon:'📋'},
                  {label:'Total People', val:totalPeople, icon:'👥'},
                  {label:'Avg Wait', val:formatTime(avgWait), icon:'⏱️'},
                  {label:'Max Wait', val:formatTime(maxWait), icon:'🔺'},
                  {label:'Min Wait', val:formatTime(minWait), icon:'🔻'},
                  {label:'Short Queues', val:history.filter(h=>parseFloat(h.predicted_time)<=10).length, icon:'✅'},
                  {label:'Medium Queues', val:history.filter(h=>parseFloat(h.predicted_time)>10&&parseFloat(h.predicted_time)<=30).length, icon:'⚠️'},
                  {label:'Long Queues', val:history.filter(h=>parseFloat(h.predicted_time)>30).length, icon:'🔴'},
                ].map((item,i) => (
                  <div key={i} style={s.summaryItem}>
                    <span style={{fontSize:24}}>{item.icon}</span>
                    <div>
                      <div style={s.summaryVal}>{item.val}</div>
                      <div style={s.summaryLabel}>{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <div style={s.footer}>
        🏥 Smart Queue Management System &nbsp;|&nbsp;
        Built with AWS Lambda + DynamoDB + React &nbsp;|&nbsp;
        © 2026 Deepika
      </div>
    </div>
  );
}

const s = {
  page:{minHeight:'100vh',background:'#fff7ed',fontFamily:"'Segoe UI',sans-serif",padding:20},
  header:{background:'linear-gradient(135deg,#c2410c,#ea580c,#f97316)',borderRadius:16,padding:'20px 28px',marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center'},
  headerLeft:{display:'flex',alignItems:'center',gap:16},
  logo:{fontSize:48},
  headerTitle:{color:'white',margin:0,fontSize:24,fontWeight:'bold'},
  headerSub:{color:'rgba(255,255,255,0.85)',margin:'4px 0 0',fontSize:14},
  headerRight:{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8},
  clockBox:{background:'rgba(255,255,255,0.2)',color:'white',padding:'6px 14px',borderRadius:20,fontSize:15,fontWeight:'bold'},
  datebox:{background:'rgba(255,255,255,0.15)',color:'white',padding:'4px 12px',borderRadius:20,fontSize:13},
  onlineBadge:{background:'rgba(255,255,255,0.2)',color:'white',padding:'4px 12px',borderRadius:20,fontSize:13},
  statsRow:{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12,marginBottom:20},
  statCard:{background:'white',borderRadius:12,padding:16,textAlign:'center',boxShadow:'0 2px 8px rgba(234,88,12,0.1)'},
  statIcon:{fontSize:24,marginBottom:6},
  statNum:{fontSize:22,fontWeight:'bold'},
  statLabel:{fontSize:11,color:'#9a3412',marginTop:4},
  tabRow:{display:'flex',gap:12,marginBottom:20},
  tab:{padding:'10px 24px',border:'2px solid #fed7aa',background:'white',borderRadius:8,cursor:'pointer',color:'#9a3412',fontWeight:'600',fontSize:15},
  tabActive:{padding:'10px 24px',border:'2px solid #ea580c',background:'linear-gradient(135deg,#ea580c,#f97316)',borderRadius:8,cursor:'pointer',color:'white',fontWeight:'600',fontSize:15},
  mainRow:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20},
  formCard:{background:'white',borderRadius:12,padding:24,boxShadow:'0 2px 8px rgba(234,88,12,0.1)'},
  resultCard:{background:'white',borderRadius:12,padding:24,boxShadow:'0 2px 8px rgba(234,88,12,0.1)'},
  card:{background:'white',borderRadius:12,padding:24,boxShadow:'0 2px 8px rgba(234,88,12,0.1)',marginBottom:20},
  cardTitle:{margin:'0 0 4px',color:'#9a3412',fontSize:18,fontWeight:'bold'},
  cardSub:{color:'#c2410c',fontSize:13,marginBottom:20},
  formGrid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16},
  label:{display:'block',marginBottom:6,color:'#7c2d12',fontWeight:'600',fontSize:13},
  input:{width:'100%',padding:10,borderRadius:8,border:'1.5px solid #fed7aa',fontSize:14,boxSizing:'border-box',background:'#fff7ed',outline:'none'},
  btn:{width:'100%',padding:14,background:'linear-gradient(135deg,#c2410c,#ea580c)',color:'white',border:'none',borderRadius:8,fontSize:16,fontWeight:'bold',cursor:'pointer',marginBottom:10},
  clearBtn:{width:'100%',padding:10,background:'white',color:'#ea580c',border:'2px solid #ea580c',borderRadius:8,fontSize:14,cursor:'pointer'},
  error:{color:'#dc2626',textAlign:'center',marginBottom:10,fontSize:14},
  resultBox:{textAlign:'center',background:'linear-gradient(135deg,#fff7ed,#ffedd5)',borderRadius:12,padding:24,marginBottom:16,border:'1px solid #fed7aa'},
  resultLabel:{color:'#9a3412',margin:0,fontSize:14},
  resultTime:{fontSize:52,fontWeight:'bold',color:'#c2410c'},
  resultMins:{color:'#ea580c',margin:'4px 0',fontSize:14},
  statusBadge:{display:'inline-block',padding:'6px 20px',borderRadius:20,fontWeight:'bold',marginTop:8,fontSize:14},
  detailGrid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16},
  detailItem:{display:'flex',alignItems:'center',gap:10,background:'#fff7ed',borderRadius:8,padding:10},
  detailIcon:{fontSize:20},
  detailLabel:{fontSize:11,color:'#9a3412'},
  detailVal:{fontSize:14,fontWeight:'bold',color:'#7c2d12'},
  tipBox:{background:'#fef3c7',border:'1px solid #fcd34d',borderRadius:8,padding:12,fontSize:13,color:'#92400e',textAlign:'center'},
  emptyResult:{textAlign:'center',padding:40},
  table:{width:'100%',borderCollapse:'collapse'},
  thead:{background:'#fff7ed'},
  th:{padding:'10px 12px',textAlign:'left',fontSize:13,color:'#9a3412',fontWeight:'600',borderBottom:'2px solid #fed7aa'},
  td:{padding:'10px 12px',fontSize:13,color:'#7c2d12',borderBottom:'1px solid #fff7ed'},
  trEven:{background:'white'},
  trOdd:{background:'#fffbf5'},
  pill:{padding:'3px 10px',borderRadius:20,fontSize:12,fontWeight:'600'},
  summaryGrid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12},
  summaryItem:{display:'flex',alignItems:'center',gap:12,background:'#fff7ed',borderRadius:8,padding:12},
  summaryVal:{fontSize:20,fontWeight:'bold',color:'#c2410c'},
  summaryLabel:{fontSize:12,color:'#9a3412'},
  footer:{textAlign:'center',color:'#9a3412',fontSize:13,marginTop:20,padding:16,background:'white',borderRadius:12}
};
