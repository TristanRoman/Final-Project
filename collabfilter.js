import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
// Animation timing
const FADE_DURATION = 800;
const LINE_DURATION = 800;

const svg = d3.select('#collabfilter-container')
    .html("")
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', '0 0 1200 800')
    .attr('preserveAspectRatio', 'xMidYMid meet');
// MASTER GROUP — everything goes inside here
const rootGroup = svg.append("g")
    .attr("class", "root")
    .attr("transform", "translate(100, 40) scale(0.75)");


// Sampled data structure
const users = [
    { id: 'user1', x: 325, y: 100 },
    { id: 'user2', x: 325, y: 720 },
    { id: 'user3', x: 800, y: 100 },
];

const movies = [
    { id: 'Toy Story', x: 50, y: 350, width: 100, height: 150, poster: 'img/toy-story-md-web.jpg' },
    { id: 'Heat', x: 270, y: 350, width: 100, height: 150, poster: 'img/heat_1995_original_film_art_5000x.webp' },
    { id: 'Se7en', x: 440, y: 350, width: 100, height: 150, poster: 'img/Seven-002.webp' },
    { id: 'Recommended: Toy Story', x: 810, y: 350, width: 100, height: 150, poster: 'img/toy-story-md-web.jpg' },
];

const connections = [
    { source: 'user1', target: 'Toy Story', rating: 4, style: 'solid' },
    { source: 'user1', target: 'Se7en', rating: 5, style: 'solid' },
    { source: 'user1', target: 'Heat', rating: 4, style: 'solid' },
    { source: 'user2', target: 'Toy Story', rating: 4.0, style: 'solid' },
    { source: 'user2', target: 'Se7en', rating: 4.5, style: 'solid' },
    { source: 'user2', target: 'Heat', rating: 4.5, style: 'solid' },
    { source: 'user3', target: 'Heat', rating: 4, style: 'solid' },
    { source: 'user3', target: 'Se7en', rating: 4, style: 'solid' },
    { source: 'user3', target: 'Recommended: Toy Story', rating: null, style: 'dotted' }, // Unknown rating
];

// Helper function to get node position
function getNodeCenter(nodeId) {
    const user = users.find(u => u.id === nodeId);
    if (user) return { x: user.x, y: user.y };
    
    const movie = movies.find(m => m.id === nodeId);
    if (movie) return { x: movie.x + movie.width/2, y: movie.y + movie.height/2 };
    
    return { x: 0, y: 0 };
}

// Helper function to calculate line length
function lineLength(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Consolidated function to draw animated lines
function drawAnimatedLine(options) {
    const {
        source,           // Node ID or {x, y} object
        target,           // Node ID or {x, y} object
        lineStyle = 'solid',  // 'solid' or 'dotted'
        rating = null,    // Optional rating label
        delay = 0,        // Animation delay in ms
        duration = LINE_DURATION  // Animation duration
    } = options;
    
    // Get coordinates
    const sourceCoords = typeof source === 'string' ? getNodeCenter(source) : source;
    const targetCoords = typeof target === 'string' ? getNodeCenter(target) : target;
    
    if (lineStyle === 'solid') {
        // Solid line: use stroke-dashoffset animation
        const length = lineLength(sourceCoords.x, sourceCoords.y, targetCoords.x, targetCoords.y);
        
        const line = linkGroup.append('line')
            .attr('x1', sourceCoords.x)
            .attr('y1', sourceCoords.y)
            .attr('x2', targetCoords.x)
            .attr('y2', targetCoords.y)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', `${length} ${length}`)
            .attr('stroke-dashoffset', length);
        
        line.transition()
            .delay(delay)
            .duration(duration)
            .attr('stroke-dashoffset', 0);
        
        // Add rating label if provided
        if (rating !== null) {
            const midX = (sourceCoords.x + targetCoords.x) / 2;
            const midY = (sourceCoords.y + targetCoords.y) / 2;
            
            // Create a group for the rating badge
            const ratingGroup = linkGroup.append('g')
                .attr('opacity', 0);
            
            // Add white rounded rectangle background
            const padding = 6;
            const bgWidth = 35;
            const bgHeight = 24;
            
            ratingGroup.append('rect')
                .attr('x', midX - bgWidth/2)
                .attr('y', midY - bgHeight/2)
                .attr('width', bgWidth)
                .attr('height', bgHeight)
                .attr('rx', 6)
                .attr('fill', 'black')
                .attr('stroke', 'white')
                .attr('stroke-width', 1.5);
            
            // Add rating text on top of background
            ratingGroup.append('text')
                .attr('x', midX)
                .attr('y', midY)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-size', '16px')
                .attr('font-weight', 'bold')
                .attr('fill', 'white')
                .text(rating);
            
            ratingGroup.transition()
                .delay(delay + duration)
                .duration(300)
                .attr('opacity', 1);
        }
    } else if (lineStyle === 'dotted') {
        // Dotted line: animate endpoint
        const line = linkGroup.append('line')
            .attr('x1', sourceCoords.x)
            .attr('y1', sourceCoords.y)
            .attr('x2', sourceCoords.x)
            .attr('y2', sourceCoords.y)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');
        
        line.transition()
            .delay(delay)
            .duration(duration)
            .attr('x2', targetCoords.x)
            .attr('y2', targetCoords.y);
    }
}

// Separate movies into initial and recommended
const initialMovies = movies.filter(m => !m.id.startsWith('Recommended'));
const recommendedMovie = movies.find(m => m.id.startsWith('Recommended'));

// Separate users
const user1 = users.find(u => u.id === 'user1');
const user2 = users.find(u => u.id === 'user2');
const user3 = users.find(u => u.id === 'user3');

// Separate connections
const user1Connections = connections.filter(c => c.source === 'user1');
const user2Connections = connections.filter(c => c.source === 'user2');
const user3ConnectionsToMovies = connections.filter(c => c.source === 'user3' && !c.target.startsWith('Recommended'));
const user3ConnectionToRecommended = connections.find(c => c.source === 'user3' && c.target.startsWith('Recommended'));

let linkGroup = rootGroup.append('g').attr('class', 'links');
let movieGroup = rootGroup.append('g').attr('class', 'movies');
let userGroup = rootGroup.append('g').attr('class', 'users');




// Main animation function
function playAnimation() {
    // Clear existing elements and stop any ongoing transitions
    rootGroup.selectAll('*').interrupt().remove();

    linkGroup = rootGroup.append('g').attr('class', 'links');
    movieGroup = rootGroup.append('g').attr('class', 'movies');
    userGroup = rootGroup.append('g').attr('class', 'users');

    
 

    
    // STEP 1: Initial movies fade in (The Usual Suspects, Heat, Seven)
    initialMovies.forEach((movie, i) => {
        const g = movieGroup.append('g')
            .attr('opacity', 0);
        
        // Add movie poster image
        g.append('image')
            .attr('x', movie.x)
            .attr('y', movie.y)
            .attr('width', movie.width)
            .attr('height', movie.height)
            .attr('href', movie.poster)
            .attr('preserveAspectRatio', 'xMidYMid slice')
            .style('border-radius', '8px')
            .style('box-shadow', '0 2px 8px rgba(0,0,0,0.3)');
        
        // Add a border/frame around the poster
        g.append('rect')
            .attr('x', movie.x)
            .attr('y', movie.y)
            .attr('width', movie.width)
            .attr('height', movie.height)
            .attr('rx', 8)
            .attr('fill', 'none')
            .attr('stroke', 'white')
            .attr('stroke-width', 2);
        
        // Fade in with slight stagger
        g.transition()
            .delay(i * 100)
            .duration(FADE_DURATION)
            .attr('opacity', 1);
    });

    // STEP 2: user1 fades in
    const user1Group = userGroup.append('g')
        .attr('opacity', 0);

    user1Group.append('circle')
        .attr('cx', user1.x)
        .attr('cy', user1.y)
        .attr('r', 40)
        .attr('fill', '#E50815')
        .attr('stroke', 'white')
        .attr('stroke-width', 2);

    user1Group.append('text')
        .attr('x', user1.x)
        .attr('y', user1.y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .attr('fill', 'white')
        .text(user1.id);

    user1Group.transition()
        .delay(1000)
        .duration(FADE_DURATION)
        .attr('opacity', 1);

    // STEP 3: Draw connections from user1 to movies
    user1Connections.forEach((conn, i) => {
        drawAnimatedLine({
            source: conn.source,
            target: conn.target,
            lineStyle: 'solid',
            rating: conn.rating,
            delay: 1900 + i * 200,
            duration: LINE_DURATION
        });
    });

    // STEP 4: user2 fades in
    const user2Group = userGroup.append('g')
        .attr('opacity', 0);

    user2Group.append('circle')
        .attr('cx', user2.x)
        .attr('cy', user2.y)
        .attr('r', 40)
        .attr('fill', '#E50815')
        .attr('stroke', 'white')
        .attr('stroke-width', 2);

    user2Group.append('text')
        .attr('x', user2.x)
        .attr('y', user2.y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .attr('fill', 'white')
        .text(user2.id);

    user2Group.transition()
        .delay(3500)
        .duration(FADE_DURATION)
        .attr('opacity', 1);

    // STEP 5: Draw connections from user2 to movies
    user2Connections.forEach((conn, i) => {
        drawAnimatedLine({
            source: conn.source,
            target: conn.target,
            lineStyle: 'solid',
            rating: conn.rating,
            delay: 4400 + i * 200,
            duration: LINE_DURATION
        });
    });


    // STEP 6: user3 fades in
    const user3Group = userGroup.append('g')
        .attr('opacity', 0);

    user3Group.append('circle')
        .attr('cx', user3.x)
        .attr('cy', user3.y)
        .attr('r', 40)
        .attr('fill', '#E50815')
        .attr('stroke', 'white')
        .attr('stroke-width', 2);

    user3Group.append('text')
        .attr('x', user3.x)
        .attr('y', user3.y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .attr('fill', 'white')
        .text(user3.id);

    user3Group.transition()
        .delay(5800)
        .duration(FADE_DURATION)
        .attr('opacity', 1);

    // STEP 7: Draw connections from user3 to movies (Heat, Seven)
    user3ConnectionsToMovies.forEach((conn, i) => {
        drawAnimatedLine({
            source: conn.source,
            target: conn.target,
            lineStyle: 'solid',
            rating: conn.rating,
            delay: 6700 + i * 200,
            duration: LINE_DURATION
        });
    });

    
    // STEP 8: Recommended movie fades in
    if (recommendedMovie) {
        const g = movieGroup.append('g')
            .attr('opacity', 0);
        
        // Add movie poster image
        g.append('image')
            .attr('x', recommendedMovie.x)
            .attr('y', recommendedMovie.y)
            .attr('width', recommendedMovie.width)
            .attr('height', recommendedMovie.height)
            .attr('href', recommendedMovie.poster)
            .attr('preserveAspectRatio', 'xMidYMid slice')
            .style('border-radius', '8px')
            .style('box-shadow', '0 2px 8px rgba(0,0,0,0.3)');
        
        // Add a border/frame around the poster
        g.append('rect')
            .attr('x', recommendedMovie.x)
            .attr('y', recommendedMovie.y)
            .attr('width', recommendedMovie.width)
            .attr('height', recommendedMovie.height)
            .attr('rx', 8)
            .attr('fill', 'none')
            .attr('stroke', 'white')
            .attr('stroke-width', 2);
        
        // Add "Recommended" label above the poster
        g.append('text')
            .attr('x', recommendedMovie.x + recommendedMovie.width/2)
            .attr('y', recommendedMovie.y - 10)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .attr('fill', 'white')
            .text('Recommended');
        
        g.transition()
            .delay(8100)
            .duration(FADE_DURATION)
            .attr('opacity', 1);
    }

    // STEP 9: Draw dotted line from user3 to Recommended
    if (user3ConnectionToRecommended) {
        drawAnimatedLine({
            source: user3ConnectionToRecommended.source,
            target: user3ConnectionToRecommended.target,
            lineStyle: 'dotted',
            delay: 8900,
            duration: 1000
        });
    }
}
// expose for main hero code
window.playCollabAnimation = playAnimation;

// Make the PLAY button run the animation every time it’s clicked
document.getElementById("collab-play-btn")?.addEventListener("click", () => {
    playAnimation();
});

